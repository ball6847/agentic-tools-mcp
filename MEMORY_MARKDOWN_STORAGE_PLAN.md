# Memory Markdown Storage Implementation Plan

## Overview

This plan implements a hybrid storage approach for memory entities where:
- **JSON files**: Store memory metadata (id, title, category, timestamps, file references)
- **Markdown files**: Store memory content only (no frontmatter)
- **File references**: JSON contains path to corresponding markdown file

## Requirements Analysis

### Current Memory Storage
- **Location**: `src/features/agent-memories/storage/file-storage.ts`
- **Format**: Single JSON file per memory with embedded content
- **Structure**: 
  ```json
  {
    "id": "uuid",
    "title": "Memory Title",
    "details": "Memory content here...",
    "category": "general",
    "dateCreated": "timestamp",
    "dateUpdated": "timestamp"
  }
  ```

### Target Memory Storage
- **JSON metadata file**: Memory metadata without content
- **Markdown content file**: Pure markdown content (no frontmatter)
- **File organization**: Category-based directory structure

```
.agentic-tools-mcp/memories/
├── user_preferences/
│   ├── concise_responses.json        # Metadata
│   ├── concise_responses.md          # Content
│   ├── technical_detail.json
│   └── technical_detail.md
├── project_context/
│   ├── react_setup.json
│   ├── react_setup.md
│   ├── api_endpoints.json
│   └── api_endpoints.md
└── general/
    ├── important_notes.json
    └── important_notes.md
```

### New JSON Metadata Format
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "User prefers concise technical responses",
  "category": "user_preferences",
  "dateCreated": "2025-01-01T00:00:00.000Z",
  "dateUpdated": "2025-01-01T00:00:00.000Z",
  "contentFile": "concise_responses.md"
}
```

### Markdown Content Format
```markdown
The user has explicitly stated they prefer concise responses with technical explanations. They value brevity but want detailed technical information when relevant.

## Key Points
- Prefers brevity over verbosity
- Values technical accuracy
- Wants actionable information
- Dislikes unnecessary explanations

## Examples
- Good: "Use `Array.map()` for transformation"
- Bad: "You could use Array.map() which is a higher-order function..."
```

## Implementation Plan

### Phase 1: Core Infrastructure

#### Step 1.1: Create Memory Markdown Storage Class
**File**: `src/features/agent-memories/storage/memory-markdown-storage.ts`

**Core responsibilities**:
- Implement existing `MemoryStorage` interface
- Handle JSON metadata files
- Manage markdown content files
- Maintain file naming consistency
- Handle CRUD operations

```typescript
interface MemoryMetadata {
  id: string;
  title: string;
  category: string;
  dateCreated: string;
  dateUpdated: string;
  contentFile: string;
}

export class MemoryMarkdownStorage implements MemoryStorage {
  private workingDirectory: string;
  private memoriesDir: string;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
    this.memoriesDir = join(workingDirectory, '.agentic-tools-mcp', 'memories');
  }

  async createMemory(memory: Memory): Promise<Memory>;
  async getMemory(id: string): Promise<Memory | null>;
  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null>;
  async deleteMemory(id: string): Promise<boolean>;
  async searchMemories(input: SearchMemoryInput): Promise<MemorySearchResult[]>;
  // ... other interface methods
}
```

#### Step 1.2: File Management Utilities
**File**: `src/features/agent-memories/utils/file-utils.ts`

**Functions**:
```typescript
// File naming and paths
export function sanitizeFileName(title: string): string;
export function getMetadataFilePath(category: string, title: string, memoriesDir: string): string;
export function getContentFilePath(category: string, title: string, memoriesDir: string): string;

// File operations
export async function writeMetadataFile(filePath: string, metadata: MemoryMetadata): Promise<void>;
export async function readMetadataFile(filePath: string): Promise<MemoryMetadata>;
export async function writeContentFile(filePath: string, content: string): Promise<void>;
export async function readContentFile(filePath: string): Promise<string>;

// Directory management
export async function ensureCategoryDirectory(category: string, memoriesDir: string): Promise<void>;
export async function findMemoryFiles(id: string, memoriesDir: string): Promise<{metadataPath: string, contentPath: string} | null>;
```

#### Step 1.3: Memory Assembly/Disassembly
**Functions in storage class**:
```typescript
// Convert Memory to separate metadata and content
private disassembleMemory(memory: Memory): {metadata: MemoryMetadata, content: string} {
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

// Convert metadata and content back to Memory
private assembleMemory(metadata: MemoryMetadata, content: string): Memory {
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
```

### Phase 2: CRUD Operations

#### Step 2.1: Create Memory Operation
```typescript
async createMemory(memory: Memory): Promise<Memory> {
  // 1. Ensure category directory exists
  await this.ensureCategoryDirectory(memory.category || 'general');
  
  // 2. Disassemble memory into metadata and content
  const { metadata, content } = this.disassembleMemory(memory);
  
  // 3. Generate file paths
  const metadataPath = this.getMetadataFilePath(metadata.category, metadata.title);
  const contentPath = this.getContentFilePath(metadata.category, metadata.title);
  
  // 4. Use the generated paths directly
  const resolvedPaths = { metadataPath, contentPath };
  
  // 5. Write files
  await this.writeMetadataFile(resolvedPaths.metadataPath, metadata);
  await this.writeContentFile(resolvedPaths.contentPath, content);
  
  return memory;
}
```

#### Step 2.2: Read Memory Operation
```typescript
async getMemory(id: string): Promise<Memory | null> {
  // 1. Find files by ID
  const filePaths = await this.findMemoryFiles(id);
  if (!filePaths) return null;
  
  // 2. Read metadata and content
  const metadata = await this.readMetadataFile(filePaths.metadataPath);
  const content = await this.readContentFile(filePaths.contentPath);
  
  // 3. Assemble and return memory
  return this.assembleMemory(metadata, content);
}
```

#### Step 2.3: Update Memory Operation
```typescript
async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
  // 1. Find existing files
  const filePaths = await this.findMemoryFiles(id);
  if (!filePaths) return null;
  
  // 2. Read current data
  const currentMetadata = await this.readMetadataFile(filePaths.metadataPath);
  const currentContent = await this.readContentFile(filePaths.contentPath);
  const currentMemory = this.assembleMemory(currentMetadata, currentContent);
  
  // 3. Apply updates
  const updatedMemory = { ...currentMemory, ...updates, updatedAt: new Date().toISOString() };
  
  // 4. Check if files need to be moved (title/category change)
  const needsMove = updates.title || updates.category;
  
  if (needsMove) {
    // Delete old files and create new ones
    await this.deleteMemoryFiles(filePaths.metadataPath, filePaths.contentPath);
    return this.createMemory(updatedMemory);
  } else {
    // Update in place
    const { metadata, content } = this.disassembleMemory(updatedMemory);
    await this.writeMetadataFile(filePaths.metadataPath, metadata);
    await this.writeContentFile(filePaths.contentPath, content);
    return updatedMemory;
  }
}
```

#### Step 2.4: Delete Memory Operation
```typescript
async deleteMemory(id: string): Promise<boolean> {
  // 1. Find files by ID
  const filePaths = await this.findMemoryFiles(id);
  if (!filePaths) return false;
  
  // 2. Delete both files
  await this.deleteMemoryFiles(filePaths.metadataPath, filePaths.contentPath);
  return true;
}
```

### Phase 3: Search Implementation

#### Step 3.1: Simple Search (Title and Category Only)
```typescript
async searchMemories(input: SearchMemoryInput): Promise<MemorySearchResult[]> {
  const query = input.query.toLowerCase();
  const results: MemorySearchResult[] = [];
  
  // 1. Get all metadata files
  const allMetadata = await this.getAllMetadataFiles(input.category);
  
  // 2. Search in title and category
  for (const metadata of allMetadata) {
    let score = 0;
    
    // Title match (higher weight)
    if (metadata.title.toLowerCase().includes(query)) {
      const titleIndex = metadata.title.toLowerCase().indexOf(query);
      score += (1 - titleIndex / metadata.title.length) * 0.8;
    }
    
    // Category match
    if (metadata.category.toLowerCase().includes(query)) {
      score += 0.2;
    }
    
    if (score > 0) {
      // Read content to assemble full memory
      const contentPath = this.getContentFilePath(metadata.category, metadata.title);
      const content = await this.readContentFile(contentPath);
      const memory = this.assembleMemory(metadata, content);
      
      results.push({
        memory,
        score,
        distance: 1 - score
      });
    }
  }
  
  // 3. Sort and limit results
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, input.limit || 10);
}
```

#### Step 3.2: Metadata Enumeration
```typescript
private async getAllMetadataFiles(categoryFilter?: string): Promise<MemoryMetadata[]> {
  const metadata: MemoryMetadata[] = [];
  
  // Read category directories
  const categories = await fs.readdir(this.memoriesDir, { withFileTypes: true });
  
  for (const category of categories) {
    if (!category.isDirectory()) continue;
    if (categoryFilter && category.name !== categoryFilter) continue;
    
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
  
  return metadata;
}
```

### Phase 4: Integration

#### Step 4.1: Update Storage Factory
**File**: `src/features/agent-memories/storage/index.ts`

```typescript
import { MemoryMarkdownStorage } from './memory-markdown-storage.js';
import { FileStorage } from './file-storage.js';

export function createMemoryStorage(workingDirectory: string): MemoryStorage {
  // For now, always use markdown storage
  // Future: add configuration option
  return new MemoryMarkdownStorage(workingDirectory);
}

// Export for backward compatibility
export { FileStorage } from './file-storage.js';
export { MemoryMarkdownStorage } from './memory-markdown-storage.js';
```

#### Step 4.2: Update Memory Tools
**Files**: `src/features/agent-memories/tools/memories/*.ts`

No changes needed - tools use the `MemoryStorage` interface, so the new implementation will work transparently.

## File Operations Details

### File Naming Strategy
```typescript
function sanitizeFileName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Collapse multiple hyphens
    .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
    .substring(0, 100);           // Limit length
}
```

### Simple File Path Generation
```typescript
async function generateFilePaths(category: string, title: string): Promise<{metadataPath: string, contentPath: string}> {
  const metadataPath = getMetadataFilePath(category, title);
  const contentPath = getContentFilePath(category, title);
  
  return { metadataPath, contentPath };
}
```

### Error Handling
```typescript
// File operation wrapper with error handling
async function safeFileOperation<T>(operation: () => Promise<T>, fallback?: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new StorageError(`File operation failed: ${error.message}`);
  }
}
```

## Success Criteria

- [ ] Memory creation generates both JSON metadata and markdown content files
- [ ] Memory updates modify content in markdown files directly
- [ ] Memory retrieval assembles data from both file types
- [ ] Memory deletion removes both files
- [ ] Search works on title and category from JSON metadata
- [ ] File naming handles special characters
- [ ] Category-based directory organization maintained
- [ ] All existing MCP memory tools work without modification
- [ ] Clean separation between metadata and content
