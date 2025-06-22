# Future Task Storage Implementation Plan

## Overview

This plan outlines the implementation of markdown-based storage for the task management system. This is a future phase that will be implemented after the core markdown storage system and memory storage are fully functional and tested.

## Prerequisites

Before implementing task storage, the following must be completed:
- ✅ Core markdown storage system (`src/shared/storage/`)
- ✅ Generic index management (`src/shared/storage/index-manager.ts`)
- ✅ Schema validation system with Zod
- ✅ Memory storage adapter working and tested
- ✅ All utility functions for markdown and relationships

## Task Storage Analysis

### Current Task Storage Structure
**Location**: `src/features/task-management/storage/file-storage.ts`
**Current Format**: Single JSON file with projects, tasks, and subtasks
**Complexity**: 
- Hierarchical task relationships (unlimited nesting)
- Project-task relationships
- Task dependencies
- Legacy subtask migration support

### Current Data Models
```typescript
interface Task {
  id: string;
  name: string;
  details: string;
  projectId: string;
  parentId?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  dependsOn?: string[];
  priority?: number;
  complexity?: number;
  status?: 'pending' | 'in-progress' | 'blocked' | 'done';
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
  level?: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
```

## Implementation Plan

### Phase 1: Task Schema and Utilities

#### Step 1.1: Create Task Schema
**File**: `src/shared/schemas/task-schema.ts`

```typescript
import { z } from 'zod';

const TaskFrontmatterSchema = z.object({
  type: z.literal('task'),
  schema: z.string().default('1.0'),
  id: z.string().uuid(),
  title: z.string().max(100),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  completed: z.boolean().default(false),
  status: z.enum(['pending', 'in-progress', 'blocked', 'done']).default('pending'),
  priority: z.number().min(1).max(10).optional(),
  complexity: z.number().min(1).max(10).optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  dependsOn: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.any()).optional()
});

const ProjectFrontmatterSchema = z.object({
  type: z.literal('project'),
  schema: z.string().default('1.0'),
  id: z.string().uuid(),
  title: z.string().max(100),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export type TaskFrontmatter = z.infer<typeof TaskFrontmatterSchema>;
export type ProjectFrontmatter = z.infer<typeof ProjectFrontmatterSchema>;
```

#### Step 1.2: Create Task Relationship Utilities
**File**: `src/features/task-management/utils/task-relationships.ts`

**Functions to implement**:
```typescript
// Dependency validation
export function validateTaskDependencies(
  task: Task, 
  allTasks: Task[]
): ValidationResult;

// Hierarchy management
export function buildTaskHierarchy(tasks: Task[]): TaskHierarchy[];
export function getTaskAncestors(taskId: string, tasks: Task[]): Task[];
export function getTaskDescendants(taskId: string, tasks: Task[]): Task[];
export function moveTaskInHierarchy(
  taskId: string, 
  newParentId: string | null, 
  tasks: Task[]
): Task[];

// Dependency graph
export function buildDependencyGraph(tasks: Task[]): DependencyGraph;
export function detectCircularDependencies(tasks: Task[]): CircularDependency[];
export function getTaskExecutionOrder(tasks: Task[]): Task[];

// Project relationships
export function getTasksByProject(projectId: string, tasks: Task[]): Task[];
export function getProjectStatistics(projectId: string, tasks: Task[]): ProjectStats;
```

### Phase 2: Task Storage Adapter

#### Step 2.1: Create Task Storage Adapter
**File**: `src/features/task-management/storage/task-markdown-storage.ts`

**Implementation Requirements**:
- Implement existing `Storage` interface from task management
- Use generic `MarkdownStorage` with Task and Project schemas
- Handle complex relationships (project, parent, dependencies)
- Maintain task hierarchy in index
- Support dependency validation
- Preserve all existing functionality

```typescript
export class TaskMarkdownStorage implements Storage {
  private taskStorage: MarkdownStorage<Task>;
  private projectStorage: MarkdownStorage<Project>;
  private relationshipManager: TaskRelationshipManager;

  async getTasks(projectId?: string, parentId?: string): Promise<Task[]>;
  async getTask(id: string): Promise<Task | null>;
  async createTask(task: Task): Promise<Task>;
  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;
  async deleteTask(id: string): Promise<boolean>;
  
  // Project operations
  async getProjects(): Promise<Project[]>;
  async createProject(project: Project): Promise<Project>;
  // ... other project methods

  // Hierarchy operations
  async getTaskHierarchy(projectId?: string, parentId?: string): Promise<TaskHierarchy[]>;
  async moveTask(taskId: string, newParentId?: string): Promise<Task | null>;
  
  // Validation and integrity
  private async validateTaskIntegrity(task: Task): Promise<void>;
  private async updateRelationshipIndex(): Promise<void>;
}
```

#### Step 2.2: Create Project-Task Index Manager
**File**: `src/features/task-management/storage/project-task-index.ts`

**Responsibilities**:
- Maintain cross-references between projects and tasks
- Track task hierarchies and dependency graphs
- Handle project deletion with cascade cleanup
- Track project statistics (task count, completion rate)
- Support project-level search and filtering
- Optimize hierarchy queries

```typescript
interface TaskIndex extends BaseIndex {
  projects: Record<string, ProjectIndexEntry>;
  hierarchy: Record<string, HierarchyEntry>;
  dependencies: Record<string, DependencyEntry>;
  byProject: Record<string, string[]>;
  byParent: Record<string, string[]>;
  rootTasks: string[];
}

interface ProjectIndexEntry {
  taskCount: number;
  completedTasks: number;
  lastUpdated: string;
  rootTaskCount: number;
  maxDepth: number;
}

interface HierarchyEntry {
  children: string[];
  depth: number;
  path: string[];
  isLeaf: boolean;
}

interface DependencyEntry {
  dependsOn: string[];
  dependents: string[];
  canExecute: boolean;
  blockedBy: string[];
}
```

### Phase 3: Directory Structure and File Organization

#### Directory Structure
```
.agentic-tools-mcp/
├── tasks/
│   ├── index.json              # Task/Project index with relationships
│   ├── projects/               # Project markdown files
│   │   ├── website-redesign.md
│   │   ├── mobile-app.md
│   │   └── api-integration.md
│   ├── tasks/                  # Task markdown files organized by project
│   │   ├── website-redesign/
│   │   │   ├── design-mockups.md
│   │   │   ├── frontend-implementation.md
│   │   │   └── user-testing.md
│   │   ├── mobile-app/
│   │   │   ├── ui-components.md
│   │   │   └── backend-integration.md
│   │   └── shared/            # Cross-project tasks
│   │       └── security-audit.md
│   └── _legacy/               # Legacy JSON backup during migration
│       └── tasks.json
```

#### File Naming Strategy
- **Projects**: `{sanitized-project-name}.md`
- **Tasks**: `{project-folder}/{sanitized-task-name}.md`
- **Shared Tasks**: `shared/{sanitized-task-name}.md`
- **Hierarchy**: Nested tasks remain in project folder, hierarchy tracked in index

### Phase 4: Enhanced Search and Queries

#### Advanced Search Features
```typescript
interface TaskSearchQuery extends BaseSearchQuery {
  projectId?: string;
  parentId?: string;
  status?: TaskStatus[];
  priority?: { min?: number; max?: number };
  complexity?: { min?: number; max?: number };
  tags?: string[];
  dependsOn?: string;
  assignee?: string;
  dueBefore?: string;
  dueAfter?: string;
  hasChildren?: boolean;
  isBlocked?: boolean;
  canExecute?: boolean;
}

// Search implementations
async searchTasks(query: TaskSearchQuery): Promise<TaskSearchResult[]>;
async searchByDependency(taskId: string): Promise<Task[]>;
async searchByHierarchy(parentId: string, depth?: number): Promise<Task[]>;
async searchBlockedTasks(): Promise<Task[]>;
async searchExecutableTasks(): Promise<Task[]>;
```

### Phase 5: Integration with Existing System

#### Step 5.1: Update Storage Factory
**File**: `src/features/task-management/storage/index.ts`

```typescript
import { TaskMarkdownStorage } from './task-markdown-storage.js';
import { FileStorage } from './file-storage.js';
import { getStorageConfig } from '../../../shared/config/storage-config.js';

export function createTaskStorage(workingDirectory: string): Storage {
  const config = getStorageConfig();
  
  if (config.format === 'markdown' && config.dataTypes.task.enabled) {
    return new TaskMarkdownStorage(workingDirectory);
  }
  
  // Fallback to existing JSON storage
  return new FileStorage(workingDirectory);
}
```

#### Step 5.2: Backward Compatibility
- Maintain all existing MCP tool interfaces
- Support hybrid mode (JSON + Markdown)
- Provide seamless transition for existing users
- Preserve all current functionality and behavior

## Data Transformation Examples

### Project Markdown Format
```markdown
---
type: project
schema: "1.0"
id: "750e8400-e29b-41d4-a716-446655440002"
title: "Website Redesign Project"
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
status: "active"
tags: ["web", "design", "frontend"]
metadata:
  client: "Acme Corp"
  budget: 50000
  deadline: "2025-06-01"
  manager: "john.doe"
---

# Website Redesign Project

Complete overhaul of the company website with modern design and improved user experience.

## Project Overview
Modernize the existing website with responsive design, improved performance, and enhanced user experience.

## Goals
- Improve page load times by 50%
- Increase conversion rate by 25%
- Implement mobile-first design
- Enhance accessibility compliance

## Timeline
- **Phase 1**: Research and Planning (2 weeks)
- **Phase 2**: Design and Prototyping (4 weeks)
- **Phase 3**: Development (8 weeks)
- **Phase 4**: Testing and Launch (2 weeks)

## Success Metrics
- Page load time < 3 seconds
- Mobile responsiveness score > 95%
- Accessibility compliance (WCAG 2.1 AA)
- User satisfaction score > 8/10
```

### Task Markdown Format
```markdown
---
type: task
schema: "1.0"
id: "650e8400-e29b-41d4-a716-446655440001"
title: "Implement user authentication"
projectId: "750e8400-e29b-41d4-a716-446655440002"
parentId: "850e8400-e29b-41d4-a716-446655440003"
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
completed: false
status: "in-progress"
priority: 8
complexity: 7
estimatedHours: 16
actualHours: 12
tags: ["authentication", "security", "backend"]
dependsOn: ["database-setup-task-id", "api-framework-task-id"]
metadata:
  assignee: "jane.smith"
  sprint: "2025-Q1-Sprint-3"
  reviewedBy: "john.doe"
---

# Implement user authentication

Create a secure authentication system using JWT tokens with refresh token rotation.

## Requirements
- JWT-based authentication with access and refresh tokens
- Password hashing using bcrypt with salt rounds ≥ 12
- Rate limiting for login attempts (5 attempts per 15 minutes)
- Account lockout after multiple failed attempts
- Password reset functionality with secure tokens

## Implementation Details

### JWT Configuration
```typescript
const jwtConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256',
  issuer: 'acme-corp',
  audience: 'acme-users'
};
```

### Security Considerations
- Store refresh tokens in httpOnly cookies
- Implement CSRF protection
- Use secure password requirements
- Log authentication events for monitoring

## Acceptance Criteria
- [ ] User can register with email/password
- [ ] User can login with valid credentials  
- [ ] JWT tokens are properly validated on protected routes
- [ ] Refresh tokens rotate on use
- [ ] Rate limiting prevents brute force attacks
- [ ] Password reset flow works end-to-end
- [ ] All authentication events are logged
- [ ] Security tests pass with 100% coverage

## Dependencies
This task depends on:
1. **Database Setup** - User table with proper indexes
2. **API Framework** - Express.js middleware setup

## Sub-tasks
- JWT token generation and validation
- Password hashing and verification  
- Rate limiting middleware
- Authentication middleware
- Password reset endpoints
- User registration validation
- Security testing suite
```

## Timeline Estimate

- **Phase 1**: Task schema and utilities (4-5 hours)
- **Phase 2**: Task storage adapter (6-8 hours)
- **Phase 3**: Directory structure and organization (2-3 hours)
- **Phase 4**: Enhanced search and queries (4-5 hours)
- **Phase 5**: Integration and compatibility (3-4 hours)

**Total Task Storage Implementation Time**: 19-25 hours

## Success Criteria

- [ ] All existing `Storage` interface methods work with markdown format
- [ ] Task hierarchies preserved exactly with unlimited nesting
- [ ] All dependencies maintained and validated
- [ ] Project-task relationships intact
- [ ] Performance equals or exceeds original JSON system
- [ ] Complex queries work correctly (hierarchy, dependencies, search)
- [ ] No circular dependencies introduced
- [ ] Backward compatibility maintained
- [ ] All MCP tools work seamlessly with new storage
- [ ] Migration path from JSON to markdown available

## Risk Mitigation

1. **Complexity Management**: Implement in phases, test each component
2. **Data Integrity**: Extensive validation of relationships and hierarchies
3. **Performance**: Index-based operations and efficient file organization
4. **Compatibility**: Maintain existing interfaces and behavior
5. **Testing**: Comprehensive test suite before deployment

This plan provides a structured approach to implementing task storage in markdown format while maintaining all current functionality and ensuring smooth integration with the existing system.
