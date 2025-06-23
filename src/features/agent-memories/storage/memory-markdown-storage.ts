import { promises as fs } from 'fs';
import { basename, dirname, join } from 'path';
import { Memory, MemorySearchResult, SearchMemoryInput } from '../models/memory.js';
import { MemoryStorage } from './storage.js';

/**
 * Interface for memory metadata stored in JSON files
 */
interface MemoryMetadata {
  id: string;
  title: string;
  category: string;
  dateCreated: string;
  dateUpdated: string;
  contentFile: string;
}

/**
 * Markdown-based storage implementation for agent memories
 * Stores each memory as two files:
 * - JSON file for metadata
 * - Markdown file for content
 */
export class MemoryMarkdownStorage implements MemoryStorage {
  private workingDirectory: string;
  private storageDir: string;
  private memoriesDir: string;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
    this.storageDir = join(workingDirectory, '.agentic-tools-mcp');
    this.memoriesDir = join(this.storageDir, 'memories');
  }

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    try {
      // Validate that working directory exists
      await fs.access(this.workingDirectory);
    } catch (error) {
      throw new Error(`Working directory does not exist or is not accessible: ${this.workingDirectory}`);
    }

    try {
      // Ensure .agentic-tools-mcp directory exists
      await fs.mkdir(this.storageDir, { recursive: true });

      // Ensure memories directory exists
      await fs.mkdir(this.memoriesDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to initialize file storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sanitize a string for safe filesystem usage
   */
  private sanitizeFileName(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Collapse multiple hyphens
      .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
      .substring(0, 100);           // Limit length
  }

  /**
   * Validate title length (max 50 characters for file naming)
   */
  private validateTitle(title: string): void {
    if (title.trim().length > 50) {
      throw new Error(`Memory title is too long for file naming (${title.trim().length} characters). Please keep titles to 50 characters or less for better organization. Current title: "${title.substring(0, 100)}..."`);
    }
  }

  /**
   * Ensure category directory and its markdown subdirectory exist
   */
  private async ensureCategoryDirectory(category: string): Promise<void> {
    const categoryDir = join(this.memoriesDir, this.sanitizeFileName(category || 'general'));
    await fs.mkdir(categoryDir, { recursive: true });
    const markdownDir = join(categoryDir, 'markdown');
    await fs.mkdir(markdownDir, { recursive: true });
  }

  /**
   * Get metadata file path for a memory
   */
  private getMetadataFilePath(category: string, title: string): string {
    const categoryDir = join(this.memoriesDir, this.sanitizeFileName(category || 'general'));
    const fileName = this.sanitizeFileName(title) + '.json';
    return join(categoryDir, fileName);
  }

  /**
   * Get content file path for a memory
   */
  private getContentFilePath(category: string, title: string): string {
    const categoryDir = join(this.memoriesDir, this.sanitizeFileName(category || 'general'));
    const markdownDir = join(categoryDir, 'markdown'); // New markdown subdirectory
    const fileName = this.sanitizeFileName(title) + '.md';
    return join(markdownDir, fileName);
  }

  /**
   * Handle file name conflicts by adding numeric suffix
   */
  private async resolveFileNameConflict(basePath: string, extension: string): Promise<string> {
    let counter = 1;
    let filePath = basePath;

    while (true) {
      try {
        await fs.access(filePath);
        // File exists, try next number
        const dir = dirname(basePath);
        const baseNameWithExt = basePath.substring(dir.length + 1); // Get filename from path
        const baseName = baseNameWithExt.replace(extension, ''); // Remove extension
        filePath = join(dir, `${baseName}_${counter}${extension}`);
        counter++;
      } catch (error) {
        // File doesn't exist, we can use this path
        break;
      }
    }

    return filePath;
  }

  /**
   * Find memory files by ID (scan all categories)
   */
  private async findMemoryFiles(id: string): Promise<{ metadataPath: string, contentPath: string } | null> {
    try {
      const categories = await fs.readdir(this.memoriesDir, { withFileTypes: true });

      for (const category of categories) {
        if (category.isDirectory()) {
          const categoryPath = join(this.memoriesDir, category.name);
          const files = await fs.readdir(categoryPath);

          // Find JSON metadata files
          const jsonFiles = files.filter(f => f.endsWith('.json'));

          for (const jsonFile of jsonFiles) {
            const metadataPath = join(categoryPath, jsonFile);
            try {
              const content = await fs.readFile(metadataPath, 'utf-8');
              const metadata = JSON.parse(content) as MemoryMetadata;

              if (metadata.id === id) {
                const contentPath = join(categoryPath, 'markdown', metadata.contentFile);
                return { metadataPath, contentPath };
              }
            } catch (error) {
              // Skip invalid JSON files
              continue;
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Write metadata to JSON file
   */
  private async writeMetadataFile(filePath: string, metadata: MemoryMetadata): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  /**
   * Write content to markdown file, adding the title header.
   * Ensures all markdown files contain H1 headers after any write operation.
   */
  private async writeContentFile(filePath: string, content: string, title: string): Promise<void> {
    const contentWithHeader = this.prependTitleHeader(title, content);
    await fs.writeFile(filePath, contentWithHeader, 'utf-8');
  }

  /**
   * Check if content has a valid H1 title header
   * Tests first line only, without requiring trailing newline
   * Returns true if content starts with valid H1 header
   */
  private hasValidTitleHeader(content: string): boolean {
    if (!content || content.trim() === '') {
      return false;
    }

    // Check first line only, remove newline requirement
    const firstLine = content.split('\n')[0];
    return /^# .+/.test(firstLine);
  }

  /**
   * Strip H1 title header from raw content.
   * Handles cases: no header, header without empty line, header with empty line.
   */
  private stripTitleHeader(rawContent: string): string {
    if (!this.hasValidTitleHeader(rawContent)) {
      return rawContent;
    }

    const lines = rawContent.split('\n');
    // Remove first line (header) and optional following empty line
    const startIndex = (lines.length > 1 && lines[1] === '') ? 2 : 1;
    return lines.slice(startIndex).join('\n');
  }

  /**
   * Prepend H1 title header to content.
   * Format: `# ${title}\n\n${content}`
   * Handles empty content case with consistent double-newline structure
   */
  private prependTitleHeader(title: string, content: string): string {
    const cleanContent = content?.trim() || '';
    return cleanContent ? `# ${title}\n\n${cleanContent}` : `# ${title}\n\n`;
  }

  /**
   * Read metadata from JSON file
   */
  private async readMetadataFile(filePath: string): Promise<MemoryMetadata> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as MemoryMetadata;
  }

  /**
   * Read content from markdown file, stripping the title header if present.
   * Returns clean content regardless of header presence.
   */
  private async readContentFile(filePath: string): Promise<string> {
    try {
      const rawContent = await fs.readFile(filePath, 'utf-8');

      if (this.hasValidTitleHeader(rawContent)) {
        return this.stripTitleHeader(rawContent);
      }

      // Return content as-is if no header present
      // Header will be added on next write operation
      return rawContent;
    } catch (error) {
      return ''; // Return empty string if file doesn't exist
    }
  }

  /**
   * Convert Memory to separate metadata and content
   */
  private disassembleMemory(memory: Memory): { metadata: MemoryMetadata, content: string } {
    const contentFileName = this.sanitizeFileName(memory.title) + '.md';

    return {
      metadata: {
        id: memory.id,
        title: memory.title,
        category: memory.category || 'general',
        dateCreated: memory.createdAt,
        dateUpdated: memory.updatedAt,
        contentFile: contentFileName
      },
      content: memory.content
    };
  }

  /**
   * Convert metadata and content back to Memory
   */
  private assembleMemory(metadata: MemoryMetadata, content: string): Memory {
    this.validateContentFile(metadata.title, metadata.contentFile);
    return {
      id: metadata.id,
      title: metadata.title,
      content: content,
      metadata: {},
      createdAt: metadata.dateCreated,
      updatedAt: metadata.dateUpdated,
      category: metadata.category === 'general' ? undefined : metadata.category
    };
  }

  /**
   * Create a new memory
   */
  async createMemory(memory: Memory): Promise<Memory> {
    // Ensure category directory exists
    await this.ensureCategoryDirectory(memory.category || 'general');

    // Validate title
    this.validateTitle(memory.title);

    // Disassemble memory into metadata and content
    const { metadata, content } = this.disassembleMemory(memory);

    // Generate file paths
    const metadataPath = this.getMetadataFilePath(metadata.category, metadata.title);
    const contentPath = this.getContentFilePath(metadata.category, metadata.title);

    // Handle file name conflicts
    const resolvedMetadataPath = await this.resolveFileNameConflict(metadataPath, '.json');

    // If metadata path changed, adjust content path accordingly
    let resolvedContentPath;
    if (resolvedMetadataPath !== metadataPath) {
      const baseName = resolvedMetadataPath.replace('.json', '');
      // Reconstruct content path to point to the markdown subdirectory
      const categoryDir = dirname(dirname(contentPath)); // Get category directory from original contentPath
      const markdownDir = join(categoryDir, 'markdown');
      resolvedContentPath = join(markdownDir, basename(baseName) + '.md');
    } else {
      resolvedContentPath = contentPath;
    }

    // Update content file name in metadata if it changed
    if (resolvedContentPath !== contentPath) {
      const contentFileName = basename(resolvedContentPath);
      metadata.contentFile = contentFileName;
    }

    // Write files
    await this.writeMetadataFile(resolvedMetadataPath, metadata);
    await this.writeContentFile(resolvedContentPath, content, memory.title);

    return memory;
  }

  /**
   * Get a specific memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    // Find files by ID
    const filePaths = await this.findMemoryFiles(id);
    if (!filePaths) return null;

    try {
      // Read metadata and content
      const metadata = await this.readMetadataFile(filePaths.metadataPath);
      const content = await this.readContentFile(filePaths.contentPath);

      // Assemble and return memory
      return this.assembleMemory(metadata, content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all memories with optional filtering
   */
  async getMemories(_agentId?: string, category?: string, limit?: number): Promise<Memory[]> {
    const memories: Memory[] = [];

    try {
      const categories = await fs.readdir(this.memoriesDir, { withFileTypes: true });

      for (const categoryEntry of categories) {
        if (categoryEntry.isDirectory()) {
          // Skip if category filter doesn't match
          if (category && categoryEntry.name !== this.sanitizeFileName(category)) {
            continue;
          }

          const categoryPath = join(this.memoriesDir, categoryEntry.name);
          const files = await fs.readdir(categoryPath);

          // Find JSON metadata files
          const jsonFiles = files.filter(f => f.endsWith('.json'));

          for (const jsonFile of jsonFiles) {
            const metadataPath = join(categoryPath, jsonFile);
            try {
              // Read metadata
              const metadata = await this.readMetadataFile(metadataPath);

              // Read content
              const contentPath = join(categoryPath, 'markdown', metadata.contentFile);
              const content = await this.readContentFile(contentPath);

              // Assemble memory
              const memory = this.assembleMemory(metadata, content);
              memories.push(memory);

              // Apply limit if specified
              if (limit && memories.length >= limit) {
                return memories;
              }
            } catch (error) {
              // Skip invalid files
              continue;
            }
          }
        }
      }

      return memories;
    } catch (error) {
      return [];
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    const filePaths = await this.findMemoryFiles(id);
    if (!filePaths) return null;
    try {
      const currentMetadata = await this.readMetadataFile(filePaths.metadataPath);
      const currentContent = await this.readContentFile(filePaths.contentPath);
      const currentMemory = this.assembleMemory(currentMetadata, currentContent);
      const updatedMemory: Memory = {
        ...currentMemory,
        ...updates,
        id: currentMemory.id,
        updatedAt: new Date().toISOString(),
      };
      if (updates.title && updates.title !== currentMemory.title) {

        const newContentPath = this.getContentFilePath(currentMemory.category || 'general', updates.title);
        const resolvedNewContentPath = await this.resolveFileNameConflict(newContentPath, '.md');
        try {
          await this.atomicFileRename(filePaths.contentPath, resolvedNewContentPath);
        } catch (error) {
          throw new Error(`Failed to rename content file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        const { metadata } = this.disassembleMemory(updatedMemory);
        await this.writeMetadataFile(filePaths.metadataPath, metadata);
      } else {
        const { metadata, content } = this.disassembleMemory(updatedMemory);
        await this.writeMetadataFile(filePaths.metadataPath, metadata);
        await this.writeContentFile(filePaths.contentPath, content, updatedMemory.title);
      }
      return updatedMemory;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    // Find files by ID
    const filePaths = await this.findMemoryFiles(id);
    if (!filePaths) return false;

    try {
      // Delete both files
      await this.deleteMemoryFiles(filePaths.metadataPath, filePaths.contentPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private validateContentFile(title: string, contentFile: string): void {

    // Allow contentFile to have numeric suffixes for conflict resolution
    const baseExpected = this.sanitizeFileName(title);
    const actualBase = contentFile.replace(/(_\d+)?\.md$/, '');

    if (actualBase !== baseExpected) {
      console.warn(`ContentFile '${contentFile}' doesn't match title '${title}'. Expected base: '${baseExpected}'`);
    }
  }

  private async atomicFileRename(oldPath: string, newPath: string): Promise<void> {
    try {
      // Check if target exists to avoid overwriting
      try {
        await fs.access(newPath);
        throw new Error(`Target file already exists: ${newPath}`);
      } catch (error: any) {
        // Good - target doesn't exist, we can proceed, or it's a file not found error
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Atomic rename
      await fs.rename(oldPath, newPath);
    } catch (error: any) {
      throw new Error(`Failed to rename file from ${oldPath} to ${newPath}: ${error.message}`);
    }
  }

  /**
   * Delete a memory's associated files (metadata and content).
   */
  private async deleteMemoryFiles(metadataPath: string, contentPath: string): Promise<void> {
    try {
      await fs.unlink(metadataPath);
      await fs.unlink(contentPath);
    } catch (error) {
      throw new Error(`Failed to delete memory files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search memories by text content
   */
  async searchMemories(input: SearchMemoryInput): Promise<MemorySearchResult[]> {
    const query = input.query.toLowerCase();
    const limit = input.limit || 10;
    // TODO: Define these as named constants for better readability and maintainability.
    const threshold = input.threshold || 0.3;
    const results: MemorySearchResult[] = [];

    // Get all metadata files
    const allMetadata = await this.getAllMetadataFiles(input.category);

    for (const metadata of allMetadata) {
      let score = 0;

      // Title match (higher weight)
      // TODO: Define these weights as named constants.
      if (metadata.title.toLowerCase().includes(query)) {
        const titleIndex = metadata.title.toLowerCase().indexOf(query);
        score += (1 - titleIndex / metadata.title.length) * 0.8;
      }

      // Category match
      // TODO: Define this weight as a named constant.
      if (metadata.category.toLowerCase().includes(query)) {
        score += 0.2;
      }

      if (score > threshold) {
        // TODO: Redundant File Reads: Consider optimizing by reading content only after initial filtering or using a lightweight content preview/index.
        const categoryDir = join(this.memoriesDir, this.sanitizeFileName(metadata.category));
        const contentPath = join(categoryDir, 'markdown', metadata.contentFile);
        const content = await this.readContentFile(contentPath);

        // Check content match
        // TODO: Define this weight as a named constant.
        if (content.toLowerCase().includes(query)) {
          const contentIndex = content.toLowerCase().indexOf(query);
          score += (1 - contentIndex / Math.min(content.length, 1000)) * 0.5;
        }

        // Normalize score
        score = Math.min(score, 1);

        if (score > threshold) {
          const memory = this.assembleMemory(metadata, content);

          results.push({
            memory,
            score,
            distance: 1 - score
          });
        }
      }
    }

    // Sort and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Get all metadata files
   */
  private async getAllMetadataFiles(categoryFilter?: string): Promise<MemoryMetadata[]> {
    const metadata: MemoryMetadata[] = [];

    try {
      // Read category directories
      const categories = await fs.readdir(this.memoriesDir, { withFileTypes: true });

      for (const category of categories) {
        if (!category.isDirectory()) continue;
        if (categoryFilter && category.name !== this.sanitizeFileName(categoryFilter)) continue;

        const categoryPath = join(this.memoriesDir, category.name);
        const files = await fs.readdir(categoryPath);

        // Find JSON metadata files
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        for (const jsonFile of jsonFiles) {
          const filePath = join(categoryPath, jsonFile);
          try {
            const fileMetadata = await this.readMetadataFile(filePath);
            metadata.push(fileMetadata);
          } catch (error) {
            // Skip invalid files
            continue;
          }
        }
      }
    } catch (error) {
      // Return empty array on error
    }

    return metadata;
  }

  /**
   * Delete all memories for a specific agent (not applicable for simplified schema)
   */
  async deleteMemoriesByAgent(agentId: string): Promise<number> {
    // Since we removed agentId from the schema, this method returns 0
    return 0;
  }

  /**
   * Get memory statistics
   */
  async getStatistics(): Promise<{
    totalMemories: number;
    memoriesByAgent: Record<string, number>;
    memoriesByCategory: Record<string, number>;
    oldestMemory?: string;
    newestMemory?: string;
    corpus?: {
      size: number;
      quality: string;
      recommendation: string;
    };
  }> {
    const allMetadata = await this.getAllMetadataFiles();
    const memoriesByCategory: Record<string, number> = {};
    let oldestMemory: string | undefined;
    let newestMemory: string | undefined;

    for (const metadata of allMetadata) {
      // Count by category
      const category = metadata.category || 'general';
      memoriesByCategory[category] = (memoriesByCategory[category] || 0) + 1;

      // Track oldest and newest
      if (!oldestMemory || metadata.dateCreated < oldestMemory) {
        oldestMemory = metadata.dateCreated;
      }
      if (!newestMemory || metadata.dateCreated > newestMemory) {
        newestMemory = metadata.dateCreated;
      }
    }

    return {
      totalMemories: allMetadata.length,
      memoriesByAgent: {}, // Empty since we removed agentId
      memoriesByCategory,
      oldestMemory,
      newestMemory
    };
  }
}