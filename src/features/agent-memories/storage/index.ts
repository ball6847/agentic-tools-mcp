import { MemoryMarkdownStorage } from './memory-markdown-storage.js';
import type { MemoryStorage } from './storage.js';
import { FileStorage } from './file-storage.js';

/**
 * Create a memory storage instance
 * @param workingDirectory - Working directory for storage
 * @param useMarkdownStorage - Whether to use markdown storage (optional)
 * @returns MemoryStorage implementation
 */
export function createMemoryStorage(workingDirectory: string, useMarkdownStorage = false): MemoryStorage {
  if (useMarkdownStorage) {
    return new MemoryMarkdownStorage(workingDirectory);
  } else {
    return new FileStorage(workingDirectory);
  }
}

// Export storage implementations for direct use
export { MemoryMarkdownStorage } from './memory-markdown-storage.js';
