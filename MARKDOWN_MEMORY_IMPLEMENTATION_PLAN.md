# Generic Markdown-Based Storage Implementation Plan

## Overview

This plan outlines the implementation of a generic markdown-based storage system for the agentic-tools-mcp project. The goal is to create a flexible storage layer that supports both Memory and Task data types, starting with memory storage and designed to accommodate future task storage migration. The approach uses markdown files for content and a JSON index for metadata and relationships.

## Current State Analysis

### Existing Implementation
- **Location**: `src/features/agent-memories/storage/file-storage.ts`
- **Storage Format**: Individual JSON files per memory
- **Organization**: Files organized by category in folders
- **File Naming**: Sanitized memory titles with `.json` extension
- **Content Structure**:
  ```json
  {
    "id": "uuid",
    "title": "Memory Title",
    "details": "Memory content here...",
    "category": "general",
    "dateCreated": "2025-01-01T00:00:00.000Z",
    "dateUpdated": "2025-01-01T00:00:00.000Z"
  }
  ```

### Storage Interface
- **Location**: `src/features/agent-memories/storage/storage.ts`
- **Contract**: `MemoryStorage` interface that must be maintained
- **Key Methods**: `createMemory`, `getMemory`, `updateMemory`, `deleteMemory`, `searchMemories`

## Target Architecture

### Generic Markdown Storage System
1. **Markdown Files**: Store actual content with frontmatter metadata for any data type
2. **JSON Index**: Entity-specific index files for fast search and relationship management
3. **Type-Safe Schemas**: Configurable frontmatter schemas per data type (Memory, Task, Project)
4. **Relationship Support**: Handle complex relationships (dependencies, hierarchies, references)
5. **Backward Compatibility**: Support both old JSON and new markdown formats

### Future-Ready Directory Structure
```
.agentic-tools-mcp/
├── memories/                   # Memory storage (Phase 1)
│   ├── index.json             # Memory index with metadata and search data
│   ├── user_preferences/      # Category-based folders
│   │   ├── concise_responses.md
│   │   └── technical_detail.md
│   ├── project_context/
│   │   ├── react_setup.md
│   │   └── api_endpoints.md
│   └── _legacy/              # Backup of old JSON files
├── tasks/                     # Task storage (Future - Phase 7)
│   ├── index.json            # Task/Project index with relationships
│   ├── projects/             # Project markdown files
│   │   ├── website_redesign.md
│   │   └── mobile_app.md
│   ├── tasks/                # Task markdown files
│   │   ├── design_mockups.md
│   │   ├── api_integration.md
│   │   └── user_testing.md
│   └── _legacy/              # Legacy JSON backup
└── shared/                   # Shared utilities and schemas
    ├── schemas/
    │   ├── memory.schema.json
    │   ├── task.schema.json
    │   └── project.schema.json
    └── templates/
        ├── memory.template.md
        ├── task.template.md
        └── project.template.md
```

### Generic Markdown File Formats

#### Memory Markdown Format
```markdown
---
type: "memory"
schema: "1.0"
id: "550e8400-e29b-41d4-a716-446655440000"
title: "User prefers concise technical responses"
category: "user_preferences"
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:00:00.000Z"
tags: ["preference", "communication"]
metadata:
  source: "conversation"
  confidence: 0.9
---

# User prefers concise technical responses

The user has explicitly stated they prefer concise responses with technical explanations. They value brevity but want detailed technical information when relevant.

## Key Points
- Prefers brevity over verbosity
- Values technical accuracy
- Wants actionable information
- Dislikes unnecessary explanations
```

#### Task Markdown Format (Future Implementation)
```markdown
---
type: "task"
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
dependsOn: ["other-task-id-1", "other-task-id-2"]
metadata:
  assignee: "john.doe"
  sprint: "2025-Q1-Sprint-3"
---

# Implement user authentication

Create a secure authentication system using JWT tokens with refresh token rotation.

## Requirements
- JWT-based authentication
- Refresh token rotation
- Password hashing with bcrypt
- Rate limiting for login attempts

## Implementation Details
```typescript
// JWT configuration
const jwtConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256'
};
```

## Acceptance Criteria
- [ ] User can register with email/password
- [ ] User can login with valid credentials
- [ ] JWT tokens are properly validated
- [ ] Refresh tokens rotate on use
```

#### Project Markdown Format (Future Implementation)
```markdown
---
type: "project"
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
- Phase 1: Research and Planning (2 weeks)
- Phase 2: Design and Prototyping (4 weeks)
- Phase 3: Development (8 weeks)
- Phase 4: Testing and Launch (2 weeks)
```

### Generic JSON Index Format
```json
{
  "version": "2.0.0",
  "format": "markdown",
  "dataType": "memory",
  "lastUpdated": "2025-01-01T00:00:00.000Z",
  "schema": {
    "version": "1.0",
    "requiredFields": ["type", "id", "title"],
    "relationships": []
  },
  "entities": {
    "550e8400-e29b-41d4-a716-446655440000": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "memory",
      "title": "User prefers concise technical responses",
      "category": "user_preferences",
      "filePath": "user_preferences/concise_responses.md",
      "created": "2025-01-01T00:00:00.000Z",
      "updated": "2025-01-01T00:00:00.000Z",
      "tags": ["preference", "communication"],
      "contentHash": "sha256hash",
      "searchTokens": ["user", "prefers", "concise", "technical", "responses"],
      "relationships": {}
    }
  },
  "categories": {
    "user_preferences": {
      "count": 5,
      "lastUpdated": "2025-01-01T00:00:00.000Z"
    }
  },
  "searchIndex": {
    "user": ["550e8400-e29b-41d4-a716-446655440000"],
    "technical": ["550e8400-e29b-41d4-a716-446655440000"]
  }
}
```

### Task Index Format (Future Implementation)
```json
{
  "version": "2.0.0",
  "format": "markdown",
  "dataType": "task",
  "lastUpdated": "2025-01-01T00:00:00.000Z",
  "schema": {
    "version": "1.0",
    "requiredFields": ["type", "id", "title", "projectId"],
    "relationships": ["projectId", "parentId", "dependsOn"]
  },
  "entities": {
    "650e8400-e29b-41d4-a716-446655440001": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "type": "task",
      "title": "Implement user authentication",
      "projectId": "750e8400-e29b-41d4-a716-446655440002",
      "parentId": "850e8400-e29b-41d4-a716-446655440003",
      "filePath": "tasks/implement_user_authentication.md",
      "status": "in-progress",
      "priority": 8,
      "complexity": 7,
      "tags": ["authentication", "security"],
      "contentHash": "sha256hash",
      "relationships": {
        "projectId": "750e8400-e29b-41d4-a716-446655440002",
        "parentId": "850e8400-e29b-41d4-a716-446655440003",
        "dependsOn": ["other-task-id-1", "other-task-id-2"],
        "children": ["child-task-id-1", "child-task-id-2"]
      }
    }
  },
  "projects": {
    "750e8400-e29b-41d4-a716-446655440002": {
      "taskCount": 15,
      "completedTasks": 8,
      "lastUpdated": "2025-01-01T00:00:00.000Z"
    }
  },
  "hierarchy": {
    "850e8400-e29b-41d4-a716-446655440003": {
      "children": ["650e8400-e29b-41d4-a716-446655440001"],
      "depth": 2
    }
  }
}
```

## Implementation Plan

### Phase 1: Create Generic Storage Foundation

#### Step 1.1: Create Generic MarkdownStorage Class
**File**: `src/shared/storage/markdown-storage.ts`

**Commands to run**:
```bash
# Navigate to project directory
cd C:\Users\ball6\Projects\personal\agentic-tools-mcp

# Create shared directory structure
mkdir -p src/shared/storage
mkdir -p src/shared/utils
mkdir -p src/shared/schemas

# Create the new storage file
touch src/shared/storage/markdown-storage.ts
```

**Implementation Requirements**:
- Generic storage class that works with any data type
- Type-safe frontmatter parsing with schema validation
- Support for relationships and hierarchies
- Maintain separate index files per data type
- Plugin architecture for data-type-specific behaviors

#### Step 1.2: Create Schema System
**Files**: 
- `src/shared/schemas/base-schema.ts`
- `src/shared/schemas/memory-schema.ts`
- `src/shared/schemas/task-schema.ts` (future)

**Schema Features**:
- Frontmatter validation per data type
- Required field enforcement
- Relationship field definitions
- Migration support between schema versions

#### Step 1.3: Add Enhanced Dependencies
**File**: `package.json`

**Commands to run**:
```bash
npm install gray-matter
npm install --save-dev @types/gray-matter
```

**Dependencies Explained**:
- `gray-matter`: Parse YAML frontmatter in markdown files
- `zod`: Schema validation for frontmatter data (already in project ✅)

**Note**: We're using the existing `zod` dependency instead of adding joi/ajv for better TypeScript integration and consistency with your existing codebase.

#### Step 1.4: Create Generic Utility Functions
**File**: `src/shared/utils/markdown-utils.ts`

**Functions to implement**:
- `parseMarkdownEntity<T>(content: string, schema: EntitySchema): { frontmatter: T, content: string }`
- `generateMarkdownEntity<T>(entity: T, content: string, schema: EntitySchema): string`
- `sanitizeFileName(title: string): string`
- `generateSearchTokens(content: string): string[]`
- `validateRelationships(entity: any, relationships: RelationshipDef[]): ValidationResult`

**File**: `src/shared/utils/relationship-utils.ts`

**Functions to implement**:
- `resolveRelationships(entityId: string, index: EntityIndex): ResolvedRelationships`
- `validateHierarchy(entities: Entity[]): HierarchyValidation`
- `buildDependencyGraph(entities: Entity[]): DependencyGraph`
- `detectCircularDependencies(graph: DependencyGraph): CircularDependency[]`

### Phase 2: Generic Index Management

#### Step 2.1: Create Generic Index Manager
**File**: `src/shared/storage/index-manager.ts`

**Responsibilities**:
- Load and save JSON index for any data type
- Update search tokens and relationships
- Manage category/project statistics
- Handle file path mappings
- Validate and maintain referential integrity
- Support hierarchical data structures

#### Step 2.2: Create Memory-Specific Storage Adapter
**File**: `src/features/agent-memories/storage/memory-markdown-storage.ts`

**Purpose**: Wrapper around generic MarkdownStorage specifically for Memory entities
- Implement `MemoryStorage` interface
- Configure with Memory schema
- Handle Memory-specific search logic
- Maintain backward compatibility

#### Step 2.3: Implement Enhanced Search System
**Methods to implement**:
- Fast text search using pre-built index
- Category filtering for memories
- Tag-based search across entities
- Relationship-aware search (future: find all tasks in project)
- Relevance scoring with markdown structure awareness
- Hierarchical search (future: search within task subtrees)

## Implementation Plan

### Phase 1: Create Generic Storage Foundation

#### Step 1.1: Create Generic MarkdownStorage Class
**File**: `src/shared/storage/markdown-storage.ts`

**Commands to run**:
```bash
# Navigate to project directory
cd C:\Users\ball6\Projects\personal\agentic-tools-mcp

# Create shared directory structure
mkdir -p src/shared/storage
mkdir -p src/shared/utils
mkdir -p src/shared/schemas

# Create the new storage file
touch src/shared/storage/markdown-storage.ts
```

**Implementation Requirements**:
- Generic storage class that works with any data type
- Type-safe frontmatter parsing with schema validation
- Support for relationships and hierarchies
- Maintain separate index files per data type
- Plugin architecture for data-type-specific behaviors

#### Step 1.2: Create Schema System
**Files**: 
- `src/shared/schemas/base-schema.ts`
- `src/shared/schemas/memory-schema.ts`
- `src/shared/schemas/task-schema.ts` (future)

**Schema Features**:
- Frontmatter validation per data type
- Required field enforcement
- Relationship field definitions
- Migration support between schema versions

#### Step 1.3: Add Enhanced Dependencies
**File**: `package.json`

**Commands to run**:
```bash
npm install gray-matter
npm install --save-dev @types/gray-matter
```

**Dependencies Explained**:
- `gray-matter`: Parse YAML frontmatter in markdown files
- `zod`: Schema validation for frontmatter data (already in project ✅)

**Note**: We're using the existing `zod` dependency instead of adding joi/ajv for better TypeScript integration and consistency with your existing codebase.

#### Step 1.4: Create Generic Utility Functions
**File**: `src/shared/utils/markdown-utils.ts`

**Functions to implement**:
- `parseMarkdownEntity<T>(content: string, schema: EntitySchema): { frontmatter: T, content: string }`
- `generateMarkdownEntity<T>(entity: T, content: string, schema: EntitySchema): string`
- `sanitizeFileName(title: string): string`
- `generateSearchTokens(content: string): string[]`
- `validateRelationships(entity: any, relationships: RelationshipDef[]): ValidationResult`

**File**: `src/shared/utils/relationship-utils.ts`

**Functions to implement**:
- `resolveRelationships(entityId: string, index: EntityIndex): ResolvedRelationships`
- `validateHierarchy(entities: Entity[]): HierarchyValidation`
- `buildDependencyGraph(entities: Entity[]): DependencyGraph`
- `detectCircularDependencies(graph: DependencyGraph): CircularDependency[]`

### Phase 2: Generic Index Management

#### Step 2.1: Create Generic Index Manager
**File**: `src/shared/storage/index-manager.ts`

**Responsibilities**:
- Load and save JSON index for any data type
- Update search tokens and relationships
- Manage category/project statistics
- Handle file path mappings
- Validate and maintain referential integrity
- Support hierarchical data structures

#### Step 2.2: Create Memory-Specific Storage Adapter
**File**: `src/features/agent-memories/storage/memory-markdown-storage.ts`

**Purpose**: Wrapper around generic MarkdownStorage specifically for Memory entities
- Implement `MemoryStorage` interface
- Configure with Memory schema
- Handle Memory-specific search logic
- Maintain backward compatibility

#### Step 2.3: Implement Enhanced Search System
**Methods to implement**:
- Fast text search using pre-built index
- Category filtering for memories
- Tag-based search across entities
- Relationship-aware search (future: find all tasks in project)
- Relevance scoring with markdown structure awareness
- Hierarchical search (future: search within task subtrees)

### Phase 3: Configuration System

#### Step 3.1: Add Generic Storage Format Configuration
**File**: `src/shared/config/storage-config.ts`

**Configuration Options**:
```typescript
interface GenericStorageConfig {
  format: 'json' | 'markdown' | 'hybrid';
  enableSearch: boolean;
  enableFrontmatter: boolean;
  dataTypes: {
    memory: MemoryStorageConfig;
    task: TaskStorageConfig;      // Future
    project: ProjectStorageConfig; // Future
  };
}

interface MemoryStorageConfig {
  schemaVersion: string;
  searchTokenizers: string[];
  categoryRequired: boolean;
}

interface TaskStorageConfig {         // Future
  schemaVersion: string;
  validateDependencies: boolean;
  maxHierarchyDepth: number;
  hierarchyRequired: boolean;
}
```

#### Step 3.2: Update Storage Factory
**File**: `src/shared/storage/storage-factory.ts`

**Logic**:
- Check configuration format per data type
- Return appropriate storage implementation
- Validate schema compatibility

### Phase 4: Documentation and Examples

#### Step 4.1: Update README.md
**Sections to update**:
- Generic storage format options
- Markdown format examples for memories
- Configuration options
- Links to detailed documentation

**Note**: Detailed documentation tasks are covered in the separate `MARKDOWN_STORAGE_DOCUMENTATION_PLAN.md`

## Implementation Details

### Generic Storage Architecture

#### Base Entity Interface
```typescript
interface BaseEntity {
  id: string;
  type: string;
  title: string;
  created: string;
  updated: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface EntitySchema {
  version: string;
  type: string;
  requiredFields: string[];
  optionalFields: string[];
  relationships: RelationshipDef[];
  validation: ValidationRules;
}

interface RelationshipDef {
  field: string;
  targetType: string;
  cardinality: 'one' | 'many';
  required: boolean;
  cascadeDelete?: boolean;
}
```

#### Generic MarkdownStorage Class Structure
```typescript
class MarkdownStorage<T extends BaseEntity> {
  constructor(
    private workingDirectory: string,
    private dataType: string,
    private schema: EntitySchema,
    private config: StorageConfig
  ) {}

  async initialize(): Promise<void>
  async create(entity: T): Promise<T>
  async get(id: string): Promise<T | null>
  async update(id: string, updates: Partial<T>): Promise<T | null>
  async delete(id: string): Promise<boolean>
  async search(query: SearchQuery): Promise<SearchResult<T>[]>
  async getByRelationship(field: string, value: string): Promise<T[]>
  async validateRelationships(entity: T): Promise<ValidationResult>
}
```

### File Naming Convention
- **Markdown files**: `{sanitized-title}.md`
- **Sanitization rules**: 
  - Replace spaces with hyphens
  - Remove special characters: `/\:*?"<>|`
  - Lowercase all characters
  - Limit to 100 characters
  - Remove leading/trailing hyphens

### Schema Definitions

#### Memory Schema (Using Zod)
```typescript
import { z } from 'zod';

const MemoryFrontmatterSchema = z.object({
  type: z.literal('memory'),
  schema: z.string().default('1.0'),
  id: z.string().uuid(),
  title: z.string().max(50),
  category: z.string().regex(/^[\\w_]+$/).optional(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

type MemoryFrontmatter = z.infer<typeof MemoryFrontmatterSchema>;
```

#### Task Schema (Future - Using Zod)
```typescript
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

type TaskFrontmatter = z.infer<typeof TaskFrontmatterSchema>;
```

### Enhanced Search Implementation
1. **Index-based search**: Use pre-built token index for fast lookup
2. **Content search**: Fall back to full-text search when needed
3. **Relationship-aware search**: Find entities by relationships (e.g., all tasks in project)
4. **Hierarchical search**: Search within specific subtrees (for task hierarchies)
5. **Relevance scoring**: 
   - Title matches: 60% weight
   - Content matches: 30% weight
   - Tag matches: 10% weight
6. **Category/Project filtering**: Use index for instant filtering

### Error Handling and Validation
- **Invalid frontmatter**: Graceful fallback to content-only
- **Schema validation**: Enforce required fields and data types
- **Relationship validation**: Check referential integrity
- **Circular dependency detection**: Prevent infinite loops in task dependencies
- **Missing index**: Rebuild index from existing files
- **File conflicts**: Auto-resolve with numeric suffixes
- **Migration failures**: Detailed logging and rollback options
- **Orphaned entities**: Handle broken relationships gracefully

## Files to Create/Modify

### New Shared Infrastructure Files
1. `src/shared/storage/markdown-storage.ts` - Generic markdown storage
2. `src/shared/storage/index-manager.ts` - Generic index management
3. `src/shared/storage/storage-factory.ts` - Storage factory pattern
4. `src/shared/utils/markdown-utils.ts` - Markdown parsing utilities
5. `src/shared/utils/relationship-utils.ts` - Relationship validation
6. `src/shared/schemas/base-schema.ts` - Base schema definitions
7. `src/shared/schemas/memory-schema.ts` - Memory schema
8. `src/shared/schemas/task-schema.ts` - Task schema (future)
9. `src/shared/config/storage-config.ts` - Generic storage configuration

### Memory-Specific Files
10. `src/features/agent-memories/storage/memory-markdown-storage.ts` - Memory adapter
11. `src/features/agent-memories/config/memory-config.ts` - Memory configuration

### Documentation Files
12. Basic README.md updates

### Files to Modify
1. `src/features/agent-memories/storage/index.ts` - Update to use new storage factory
2. `package.json` - Add gray-matter dependency
3. `README.md` - Update documentation
4. `src/features/agent-memories/tools/` - Update tools to support new format

**Note**: 
- **Testing files** are documented in the separate `MARKDOWN_STORAGE_TESTING_PLAN.md`
- **Task storage files** are documented in the separate `FUTURE_TASK_STORAGE_PLAN.md`
- **Documentation files** are documented in the separate `MARKDOWN_STORAGE_DOCUMENTATION_PLAN.md`
- **Migration files** are documented in the separate `MARKDOWN_STORAGE_MIGRATION_PLAN.md`

### Development Commands
```bash
# Install new dependencies
npm install gray-matter
npm install --save-dev @types/gray-matter jest @types/jest ts-jest

# Build project
npm run build

# Run tests
npm run test

# Start development server
npm run dev
```

### Migration Commands
```bash
# Migrate memories with backup
node dist/migration/migrate-entities.js --type=memory --source="/path/to/memories" --backup

# Migrate tasks (future)
node dist/migration/migrate-entities.js --type=task --source="/path/to/tasks" --backup

# Dry run migration
node dist/migration/migrate-entities.js --type=memory --source="/path/to/memories" --dry-run

# Force migration (overwrite existing)
node dist/migration/migrate-entities.js --type=memory --source="/path/to/memories" --force

# Validate entities after migration
node dist/migration/validate-entities.js --type=memory --source="/path/to/memories"
```

### Testing Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test -- markdown-storage.test.ts

# Run tests with coverage
npm test -- --coverage
```

## Files to Create/Modify

### New Files to Create
1. `src/features/agent-memories/storage/markdown-storage.ts`
2. `src/features/agent-memories/utils/markdown-utils.ts`
3. `src/features/agent-memories/storage/index-manager.ts`
4. `src/features/agent-memories/migration/json-to-markdown.ts`
5. `src/features/agent-memories/config/storage-config.ts`
6. `src/migration/migrate-memories.ts`
7. `tests/features/agent-memories/storage/markdown-storage.test.ts`
8. `tests/features/agent-memories/utils/markdown-utils.test.ts`
9. `tests/features/agent-memories/migration/json-to-markdown.test.ts`
10. `docs/MARKDOWN_MEMORIES_GUIDE.md`

### Files to Modify
1. `src/features/agent-memories/storage/index.ts` - Add storage factory logic
2. `package.json` - Add new dependencies
3. `README.md` - Update documentation
4. `src/features/agent-memories/tools/` - Update tools to support new format

## Example Usage After Implementation

### Creating a Memory (Direct Markdown Editing)
```bash
# Navigate to memory directory
cd .agentic-tools-mcp/memories/user_preferences

# Create new memory file
echo "---
type: memory
schema: \"1.0\"
id: $(uuidgen)
title: API Rate Limiting Strategy
category: technical
created: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
updated: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
tags: [api, rate-limiting, performance]
---

# API Rate Limiting Strategy

Implement exponential backoff with jitter for API calls.

## Implementation
\`\`\`typescript
const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
\`\`\`" > api-rate-limiting-strategy.md
```

### Creating a Task (Future - Direct Markdown Editing)
```bash
# Navigate to task directory
cd .agentic-tools-mcp/tasks/tasks

# Create new task file
echo "---
type: task
schema: \"1.0\"
id: $(uuidgen)
title: Implement user authentication
projectId: \"project-uuid-here\"
parentId: \"parent-task-uuid\"
created: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
updated: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
completed: false
status: in-progress
priority: 8
complexity: 7
estimatedHours: 16
tags: [authentication, security, backend]
dependsOn: [\"other-task-id-1\", \"other-task-id-2\"]
---

# Implement user authentication

Create a secure authentication system using JWT tokens.

## Requirements
- JWT-based authentication
- Refresh token rotation
- Password hashing with bcrypt

## Acceptance Criteria
- [ ] User can register with email/password
- [ ] User can login with valid credentials
- [ ] JWT tokens are properly validated" > implement-user-authentication.md
```

### Searching Across Data Types
```typescript
// Memory search (existing functionality)
const memoryResults = await searchMemories({
  query: "API rate limiting",
  limit: 5,
  category: "technical"
});

// Task search (future functionality)
const taskResults = await searchTasks({
  query: "authentication",
  limit: 10,
  projectId: "project-uuid",
  status: "in-progress"
});

// Cross-entity search (future)
const allResults = await searchEntities({
  query: "security",
  types: ["memory", "task"],
  limit: 20
});
```

## Benefits After Implementation

1. **Human Readable**: All entities stored in markdown format
2. **Direct Editing**: Users can edit `.md` files without assistant
3. **Rich Formatting**: Support for code blocks, lists, headers across all data types
4. **Git Friendly**: Better diffs and version control for all project data
5. **Fast Search**: JSON index maintains search performance across entities
6. **Relationship Support**: Handle complex task dependencies and project relationships
7. **Backward Compatible**: Existing JSON data continues to work
8. **Easy Migration**: One-command migration for any data type
9. **Future Ready**: Extensible architecture for new data types
10. **Type Safety**: Schema validation for all entity types

## Risk Mitigation

1. **Data Loss Prevention**: Always backup before migration
2. **Gradual Rollout**: Implement as optional feature first
3. **Fallback Support**: Maintain JSON storage as fallback
4. **Relationship Integrity**: Validate all relationships during operations
5. **Schema Evolution**: Support for schema versioning and migration
6. **Validation**: Extensive testing before production use
7. **Documentation**: Clear migration and usage instructions
8. **Performance**: Index-based operations maintain speed

## Success Criteria

- [ ] All existing storage interfaces work with markdown format
- [ ] Search performance equals or exceeds current JSON implementation
- [ ] 100% data integrity during migration for all entity types
- [ ] Users can edit markdown files directly and changes are reflected in search
- [ ] Backward compatibility maintained for existing JSON data
- [ ] Relationship validation works correctly for complex task hierarchies
- [ ] Schema validation prevents invalid data entry
- [ ] Clear documentation and examples provided for all entity types
- [ ] Migration tool works reliably with various data configurations
- [ ] Future task storage can be implemented without major refactoring

## Timeline Estimate

- **Phase 1**: 4-5 hours (Generic storage foundation)
- **Phase 2**: 3-4 hours (Index management and memory adapter)
- **Phase 3**: 2-3 hours (Configuration system)
- **Phase 4**: 1-2 hours (Basic README updates)

**Total Estimated Time for Core Storage System**: 10-14 hours

**Additional Components (Separate Plans)**:
- **Testing**: 15-21 hours (see `MARKDOWN_STORAGE_TESTING_PLAN.md`)
- **Documentation**: 24-32 hours (see `MARKDOWN_STORAGE_DOCUMENTATION_PLAN.md`)
- **Migration**: 18-24 hours (see `MARKDOWN_STORAGE_MIGRATION_PLAN.md`)
- **Future Task Storage**: 19-25 hours (see `FUTURE_TASK_STORAGE_PLAN.md`)

## Implementation Notes

### Plan Separation Benefits
The implementation has been separated into focused plan files to enable:
- **Focused Development**: Core storage can be implemented without distractions
- **Parallel Work**: Different teams can work on storage, testing, docs, and migration
- **Risk Reduction**: Core system can be thoroughly tested before adding complexity
- **Flexible Scheduling**: Each component can be scheduled based on priorities and resources

### Core Storage Focus
This plan focuses exclusively on the essential storage system:
- Generic markdown storage architecture
- Memory storage adapter implementation
- Basic configuration system
- Essential documentation updates

### Future Task Storage
**Note**: Task storage implementation is documented in `FUTURE_TASK_STORAGE_PLAN.md`

The generic architecture ensures that when task storage is implemented:
- **Minimal Refactoring**: Most infrastructure can be reused
- **Consistent Interface**: Same patterns and utilities across all data types
- **Relationship Support**: Complex task hierarchies and dependencies are already supported
- **Schema Evolution**: Version management and validation are built-in

This plan provides a comprehensive roadmap for implementing a generic markdown-based storage system that starts with memory storage and is architected to seamlessly support task storage migration in the future. The design ensures maintainability, extensibility, and performance while providing a superior user experience through direct markdown editing capabilities.
