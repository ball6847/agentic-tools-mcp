import { promises as fs } from 'fs';
import { join } from 'path';
import { Storage, StorageData } from './storage.js';
import { Project } from '../models/project.js';
import { Task, TaskHierarchy } from '../models/task.js';
import { Subtask } from '../models/subtask.js';
import { getVersion } from '../../../utils/version.js';

/**
 * File-based storage implementation using JSON with project-specific directories
 * Version 2.0: Updated for unified task model with migration support
 */
export class FileStorage implements Storage {
  private workingDirectory: string;
  private storageDir: string;
  private dataFile: string;
  private data: StorageData;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
    this.storageDir = join(workingDirectory, '.agentic-tools-mcp', 'tasks');
    this.dataFile = join(this.storageDir, 'tasks.json');
    this.data = {
      projects: [],
      tasks: [],
      subtasks: [],
      migration: {
        version: getVersion()
      }
    };
  }

  /**
   * Initialize storage by validating working directory and loading data from file
   */
  async initialize(): Promise<void> {
    try {
      // Validate that working directory exists
      await fs.access(this.workingDirectory);
    } catch (error) {
      throw new Error(`Working directory does not exist or is not accessible: ${this.workingDirectory}`);
    }

    try {
      // Ensure .agentic-tools-mcp/tasks directory exists
      await fs.mkdir(this.storageDir, { recursive: true });

      // Try to load existing data
      const fileContent = await fs.readFile(this.dataFile, 'utf-8');
      const loadedData = JSON.parse(fileContent);

      // Ensure migration metadata exists
      this.data = {
        projects: loadedData.projects || [],
        tasks: loadedData.tasks || [],
        subtasks: loadedData.subtasks || [],
        migration: loadedData.migration || { version: getVersion() }
      };

      // Check if migration is needed
      const migrationStatus = await this.getMigrationStatus();
      if (migrationStatus.needsMigration) {
        console.log(`Migration needed: ${migrationStatus.subtaskCount} subtasks to migrate`);
        // Auto-migrate on load
        const result = await this.migrateToUnifiedModel();
        console.log(`Migration completed: ${result.migratedSubtasks} subtasks migrated`);
        if (result.errors.length > 0) {
          console.warn('Migration errors:', result.errors);
        }
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty data
      await this.save();
    }
  }

  /**
   * Save data to file
   */
  private async save(): Promise<void> {
    await fs.writeFile(this.dataFile, JSON.stringify(this.data, null, 2));
  }

    /**
   * Calculate task level in hierarchy
   */
  private calculateTaskLevel(task: Task): number {
    if (!task.parentId) return 0;

    let level = 0;
    let currentParentId: string | undefined = task.parentId;
    const visited = new Set<string>();

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parent = this.data.tasks.find(t => t.id === currentParentId);
      if (!parent) break;
      level++;
      currentParentId = parent.parentId;
    }

    return level;
  }

  /**
   * Update task levels for all tasks
   */
  private updateTaskLevels(): void {
    for (const task of this.data.tasks) {
      task.level = this.calculateTaskLevel(task);
    }
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return [...this.data.projects];
  }

  async getProject(id: string): Promise<Project | null> {
    return this.data.projects.find(p => p.id === id) || null;
  }

  async createProject(project: Project): Promise<Project> {
    this.data.projects.push(project);
    await this.save();
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.data.projects[index] = { ...this.data.projects[index], ...updates };
    await this.save();
    return this.data.projects[index];
  }

  async deleteProject(id: string): Promise<boolean> {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.data.projects.splice(index, 1);
    // Also delete all related tasks (including nested ones)
    await this.deleteTasksByProject(id);
    await this.save();
    return true;
  }

  // Task operations (unified model)
  async getTasks(projectId?: string, parentId?: string): Promise<Task[]> {
    let tasks = [...this.data.tasks];

    if (projectId) {
      tasks = tasks.filter(t => t.projectId === projectId);
    }

    if (parentId !== undefined) {
      tasks = tasks.filter(t => t.parentId === parentId);
    }

    // Update levels before returning
    this.updateTaskLevels();
    return tasks;
  }

  async getTask(id: string): Promise<Task | null> {
    const task = this.data.tasks.find(t => t.id === id) || null;
    if (task) {
      task.level = this.calculateTaskLevel(task);
    }
    return task;
  }

  async createTask(task: Task): Promise<Task> {
    // Validate parent exists if specified
    if (task.parentId) {
      const parent = await this.getTask(task.parentId);
      if (!parent) {
        throw new Error(`Parent task with id ${task.parentId} not found`);
      }
      // Ensure task belongs to same project as parent
      if (parent.projectId !== task.projectId) {
        throw new Error(`Task must belong to same project as parent task`);
      }
    }

    task.level = this.calculateTaskLevel(task);
    this.data.tasks.push(task);
    await this.save();
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    const task = this.data.tasks[index];

    // If updating parentId, validate the new parent
    if (updates.parentId !== undefined) {
      if (updates.parentId) {
        const parent = await this.getTask(updates.parentId);
        if (!parent) {
          throw new Error(`Parent task with id ${updates.parentId} not found`);
        }
        // Prevent circular references
        if (await this.wouldCreateCircularReference(id, updates.parentId)) {
          throw new Error(`Moving task would create a circular reference`);
        }
      }
    }

    this.data.tasks[index] = { ...task, ...updates };
    this.data.tasks[index].level = this.calculateTaskLevel(this.data.tasks[index]);
    await this.save();
    return this.data.tasks[index];
  }

  async deleteTask(id: string): Promise<boolean> {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    // Delete all child tasks recursively
    await this.deleteTasksByParent(id);

    this.data.tasks.splice(index, 1);
    await this.save();
    return true;
  }

  async deleteTasksByProject(projectId: string): Promise<number> {
    const tasksToDelete = this.data.tasks.filter(t => t.projectId === projectId);
    this.data.tasks = this.data.tasks.filter(t => t.projectId !== projectId);
    await this.save();
    return tasksToDelete.length;
  }

  async deleteTasksByParent(parentId: string): Promise<number> {
    const childTasks = this.data.tasks.filter(t => t.parentId === parentId);
    let deletedCount = 0;

    // Recursively delete children first
    for (const child of childTasks) {
      deletedCount += await this.deleteTasksByParent(child.id);
    }

    // Delete direct children
    const directChildren = this.data.tasks.filter(t => t.parentId === parentId);
    this.data.tasks = this.data.tasks.filter(t => t.parentId !== parentId);
    deletedCount += directChildren.length;

    await this.save();
    return deletedCount;
  }

  // Task hierarchy operations
  async getTaskHierarchy(projectId?: string, parentId?: string): Promise<TaskHierarchy[]> {
    const tasks = await this.getTasks(projectId, parentId);
    const hierarchies: TaskHierarchy[] = [];

    for (const task of tasks) {
      const children = await this.getTaskHierarchy(projectId, task.id);
      hierarchies.push({
        task,
        children,
        depth: task.level || 0
      });
    }

    return hierarchies;
  }

  async getTaskChildren(taskId: string): Promise<Task[]> {
    return this.data.tasks.filter(t => t.parentId === taskId);
  }

  async getTaskAncestors(taskId: string): Promise<Task[]> {
    const ancestors: Task[] = [];
    let currentTask = await this.getTask(taskId);

    while (currentTask?.parentId) {
      const parent = await this.getTask(currentTask.parentId);
      if (!parent) break;
      ancestors.unshift(parent);
      currentTask = parent;
    }

    return ancestors;
  }

  async moveTask(taskId: string, newParentId?: string): Promise<Task | null> {
    if (newParentId && await this.wouldCreateCircularReference(taskId, newParentId)) {
      throw new Error('Moving task would create a circular reference');
    }

    return this.updateTask(taskId, { parentId: newParentId });
  }

  /**
   * Check if moving a task would create a circular reference
   */
  private async wouldCreateCircularReference(taskId: string, newParentId: string): Promise<boolean> {
    let currentParentId: string | undefined = newParentId;
    const visited = new Set<string>();

    while (currentParentId && !visited.has(currentParentId)) {
      if (currentParentId === taskId) {
        return true;
      }
      visited.add(currentParentId);
      const parent = await this.getTask(currentParentId);
      currentParentId = parent?.parentId;
    }

    return false;
  }

  // Migration operations
  async migrateToUnifiedModel(): Promise<{ migratedSubtasks: number; errors: string[] }> {
    const errors: string[] = [];
    let migratedCount = 0;

    if (!this.data.subtasks || this.data.subtasks.length === 0) {
      // Update migration metadata
      this.data.migration = {
        version: getVersion(),
        migratedAt: new Date().toISOString(),
        subtasksMigrated: 0
      };
      await this.save();
      return { migratedSubtasks: 0, errors: [] };
    }

    for (const subtask of this.data.subtasks) {
      try {
        // Convert subtask to task
        const task: Task = {
          id: subtask.id,
          name: subtask.name,
          details: subtask.details,
          projectId: subtask.projectId,
          parentId: subtask.taskId, // taskId becomes parentId
          completed: subtask.completed,
          createdAt: subtask.createdAt,
          updatedAt: subtask.updatedAt,
          // Set reasonable defaults for new fields
          priority: 5,
          complexity: 3,
          status: subtask.completed ? 'done' : 'pending'
        };

        // Verify parent task exists
        const parentExists = this.data.tasks.find(t => t.id === task.parentId);
        if (!parentExists) {
          errors.push(`Parent task ${task.parentId} not found for subtask ${subtask.id}`);
          continue;
        }

        // Add to tasks array
        this.data.tasks.push(task);
        migratedCount++;
      } catch (error) {
        errors.push(`Failed to migrate subtask ${subtask.id}: ${error}`);
      }
    }

    // Clear subtasks array and update migration metadata
    this.data.subtasks = [];
    this.data.migration = {
      version: getVersion(),
      migratedAt: new Date().toISOString(),
      subtasksMigrated: migratedCount
    };

    await this.save();
    return { migratedSubtasks: migratedCount, errors };
  }

  async getMigrationStatus(): Promise<{ needsMigration: boolean; subtaskCount: number; version: string }> {
    const subtaskCount = this.data.subtasks?.length || 0;
    const needsMigration = subtaskCount > 0;
    const version = this.data.migration?.version || 'unknown';

    return { needsMigration, subtaskCount, version };
  }

  // Legacy subtask operations (deprecated, for backward compatibility)
  /** @deprecated Use getTasks with parentId instead */
  async getSubtasks(taskId?: string, projectId?: string): Promise<Subtask[]> {
    if (!this.data.subtasks) return [];

    let subtasks = [...this.data.subtasks];

    if (taskId) {
      subtasks = subtasks.filter(s => s.taskId === taskId);
    }

    if (projectId) {
      subtasks = subtasks.filter(s => s.projectId === projectId);
    }

    return subtasks;
  }

  /** @deprecated Use getTask instead */
  async getSubtask(id: string): Promise<Subtask | null> {
    if (!this.data.subtasks) return null;
    return this.data.subtasks.find(s => s.id === id) || null;
  }

  /** @deprecated Use createTask instead */
  async createSubtask(subtask: Subtask): Promise<Subtask> {
    if (!this.data.subtasks) this.data.subtasks = [];
    this.data.subtasks.push(subtask);
    await this.save();
    return subtask;
  }

  /** @deprecated Use updateTask instead */
  async updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask | null> {
    if (!this.data.subtasks) return null;

    const index = this.data.subtasks.findIndex(s => s.id === id);
    if (index === -1) return null;

    this.data.subtasks[index] = { ...this.data.subtasks[index], ...updates };
    await this.save();
    return this.data.subtasks[index];
  }

  /** @deprecated Use deleteTask instead */
  async deleteSubtask(id: string): Promise<boolean> {
    if (!this.data.subtasks) return false;

    const index = this.data.subtasks.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.data.subtasks.splice(index, 1);
    await this.save();
    return true;
  }

  /** @deprecated Use deleteTasksByParent instead */
  async deleteSubtasksByTask(taskId: string): Promise<number> {
    if (!this.data.subtasks) return 0;

    const subtasksToDelete = this.data.subtasks.filter(s => s.taskId === taskId);
    this.data.subtasks = this.data.subtasks.filter(s => s.taskId !== taskId);
    await this.save();
    return subtasksToDelete.length;
  }

  /** @deprecated Use deleteTasksByProject instead */
  async deleteSubtasksByProject(projectId: string): Promise<number> {
    if (!this.data.subtasks) return 0;

    const subtasksToDelete = this.data.subtasks.filter(s => s.projectId === projectId);
    this.data.subtasks = this.data.subtasks.filter(s => s.projectId !== projectId);
    await this.save();
    return subtasksToDelete.length;
  }
}
