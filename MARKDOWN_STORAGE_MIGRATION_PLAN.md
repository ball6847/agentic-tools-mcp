# Markdown Storage Migration Plan

## Overview

This plan outlines the migration strategy for converting existing JSON-based storage to the new markdown-based storage system. This is a separate implementation phase that will occur after the core markdown storage system is implemented and tested.

## Migration Scope

### Data Types to Migrate
1. **Memory Storage** (Phase 1 Migration)
   - Convert JSON memory files to markdown with frontmatter
   - Preserve all existing metadata and relationships
   - Build search index from converted data

2. **Task Storage** (Phase 2 Migration - Future)
   - Convert JSON task/project data to markdown format
   - Maintain task hierarchies and dependencies
   - Preserve project relationships and metadata

## Current Data Analysis

### Memory Storage Current Format
**Location**: `.agentic-tools-mcp/memories/`
**Structure**: Individual JSON files per memory organized by category
**Format**:
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

### Task Storage Current Format (Future)
**Location**: `.agentic-tools-mcp/tasks/tasks.json`
**Structure**: Single JSON file with projects, tasks, and subtasks
**Format**:
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Project Name",
      "description": "Project description",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ],
  "tasks": [
    {
      "id": "uuid",
      "name": "Task Name",
      "details": "Task details",
      "projectId": "project-uuid",
      "parentId": "parent-task-uuid",
      "completed": false,
      "priority": 8,
      "complexity": 7,
      "status": "in-progress",
      "tags": ["tag1", "tag2"],
      "dependsOn": ["task-uuid-1", "task-uuid-2"],
      "estimatedHours": 16,
      "actualHours": 12,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

## Migration Commands Reference

### Memory Migration Commands
```bash
# Basic memory migration with backup
migrate-entities --type=memory --source="/path/to/memories" --backup

# Dry run to see what would be migrated
migrate-entities --type=memory --source="/path/to/memories" --dry-run

# Force migration (overwrite existing markdown files)
migrate-entities --type=memory --source="/path/to/memories" --force

# Migrate with custom batch size
migrate-entities --type=memory --batch-size=50 --backup

# Validate migration after completion
validate-entities --type=memory --source="/path/to/memories"

# List available backups
migrate-entities --type=memory --list-backups

# Restore from specific backup
migrate-entities --type=memory --restore="backup-2025-01-01-120000"
```

### Task Migration Commands (Future)
```bash
# Migrate tasks with dependency validation
migrate-entities --type=task --source="/path/to/tasks" --backup --validate-dependencies

# Migrate with hierarchy preservation
migrate-entities --type=task --preserve-hierarchy --backup

# Migrate tasks by project split strategy
migrate-entities --type=task --split-strategy=by-project --backup

# Migrate with maximum hierarchy depth limit
migrate-entities --type=task --max-depth=5 --backup
```

### Universal Migration Commands
```bash
# Migrate all entity types
migrate-entities --type=all --backup --validate

# Show migration status
migrate-entities --status

# Rollback last migration
migrate-entities --rollback

# Clean up old backups (keep last 5)
migrate-entities --cleanup-backups --keep=5
```

### Validation Commands
```bash
# Validate specific entity type
validate-entities --type=memory --check-integrity

# Validate relationships and references
validate-entities --type=task --check-relationships --check-hierarchy

# Generate validation report
validate-entities --type=all --report=validation-report.json

# Benchmark performance after migration
validate-entities --type=memory --benchmark
```

## Migration Implementation Plan

### Phase 1: Generic Migration Framework

#### Step 1.1: Create Migration Framework
**File**: `src/shared/migration/migration-framework.ts`

**Core Features**:
```typescript
interface MigrationStrategy<TSource, TTarget> {
  validate(source: TSource): ValidationResult;
  transform(source: TSource): TTarget;
  backup(source: TSource): Promise<void>;
  rollback(): Promise<void>;
}

interface MigrationOptions {
  dryRun: boolean;
  backup: boolean;
  force: boolean;
  batchSize: number;
  validateRelationships: boolean;
}

class GenericMigrator<TSource, TTarget> {
  constructor(
    private strategy: MigrationStrategy<TSource, TTarget>,
    private options: MigrationOptions
  ) {}

  async migrate(): Promise<MigrationResult>
  async validateMigration(): Promise<ValidationResult>
  async rollback(): Promise<RollbackResult>
}
```

#### Step 1.2: Create Backup System
**File**: `src/shared/migration/backup-manager.ts`

**Features**:
- Create timestamped backups in `_legacy/` folders
- Verify backup integrity
- Support for restoration from backups
- Cleanup old backups based on retention policy

#### Step 1.3: Create Validation System
**File**: `src/shared/migration/validation-manager.ts`

**Validation Types**:
- Data integrity validation
- Relationship consistency checks
- Schema compliance verification
- Content preservation validation

### Phase 2: Memory Migration Implementation

#### Step 2.1: Memory Migration Strategy
**File**: `src/features/agent-memories/migration/memory-migration-strategy.ts`

**Transformation Logic**:
```typescript
class MemoryMigrationStrategy implements MigrationStrategy<JsonMemory, MarkdownMemory> {
  validate(source: JsonMemory): ValidationResult {
    // Validate JSON structure
    // Check required fields
    // Verify data types
  }

  transform(source: JsonMemory): MarkdownMemory {
    // Convert JSON to markdown with frontmatter
    // Map fields: details -> content, dateCreated -> created, etc.
    // Generate proper file paths
    // Create search tokens
  }

  backup(source: JsonMemory): Promise<void> {
    // Copy to _legacy/ folder with timestamp
    // Maintain directory structure
  }
}
```

#### Step 2.2: Memory Migration CLI
**File**: `src/migration/migrate-memories.ts`

**Command**: `migrate-memories`
**Options**:
```bash
migrate-memories [options]
  --source <path>        Source directory (default: current working directory)
  --dry-run             Show what would be migrated without making changes
  --backup              Create backup before migration (default: true)
  --force               Overwrite existing markdown files
  --batch-size <num>    Number of memories to process at once (default: 100)
  --validate            Validate migration after completion
  --verbose             Show detailed progress information
```

#### Step 2.3: Memory Migration Validation
**Validation Checks**:
- All JSON memories have corresponding markdown files
- Frontmatter data matches original JSON data
- Content preservation (details field -> markdown content)
- File naming consistency
- Category structure maintained
- Search index accurately reflects migrated data

### Phase 3: Task Migration Implementation (Future)

#### Step 3.1: Task Migration Strategy
**File**: `src/features/task-management/migration/task-migration-strategy.ts`

**Complex Transformations**:
- Split single JSON file into multiple markdown files
- Maintain project-task relationships
- Preserve task hierarchies and dependencies
- Handle legacy subtask migration
- Create proper cross-references in index

#### Step 3.2: Relationship Migration
**File**: `src/features/task-management/migration/relationship-migrator.ts`

**Relationship Handling**:
- Validate all task dependencies exist
- Check project-task relationships
- Verify parent-child task hierarchies
- Detect and report circular dependencies
- Create relationship index for fast lookups

#### Step 3.3: Task Migration CLI
**File**: `src/migration/migrate-tasks.ts`

**Command**: `migrate-tasks`
**Additional Options**:
```bash
migrate-tasks [options]
  --validate-dependencies    Check all task dependencies are valid
  --preserve-hierarchy      Maintain exact task hierarchy structure
  --split-strategy <type>   How to split tasks (by-project|by-category|flat)
  --max-depth <num>         Maximum task hierarchy depth to migrate
```

### Phase 4: Migration Tools and Utilities

#### Step 4.1: Universal Migration CLI
**File**: `src/migration/migrate-entities.ts`

**Unified Command**: `migrate-entities`
```bash
migrate-entities --type <memory|task|all> [options]
  --type <type>             Entity type to migrate (memory, task, all)
  --source <path>           Source directory
  --target <path>           Target directory (optional)
  --dry-run                Show what would be migrated
  --backup                 Create backup before migration
  --force                  Overwrite existing files
  --batch-size <num>       Batch processing size
  --validate               Validate after migration
  --rollback               Rollback last migration
  --list-backups           Show available backups
  --restore <backup-id>    Restore from specific backup
```

#### Step 4.2: Migration Status and Reporting
**File**: `src/migration/migration-reporter.ts`

**Reporting Features**:
- Pre-migration analysis and recommendations
- Real-time progress tracking
- Post-migration validation reports
- Performance metrics and timing
- Error reporting and suggestions
- Rollback impact analysis

#### Step 4.3: Migration Testing Tools
**File**: `src/migration/migration-tester.ts`

**Testing Features**:
- Generate test data for migration testing
- Validate migration correctness
- Performance benchmarking
- Stress testing with large datasets
- Regression testing for edge cases

### Migration Commands

#### Memory Migration Commands
```bash
# Migrate memories with backup
node dist/migration/migrate-entities.js --type=memory --source="/path/to/memories" --backup

# Dry run migration to see what would be changed
node dist/migration/migrate-entities.js --type=memory --source="/path/to/memories" --dry-run

# Force migration (overwrite existing markdown files)
node dist/migration/migrate-entities.js --type=memory --source="/path/to/memories" --force

# Validate entities after migration
node dist/migration/validate-entities.js --type=memory --source="/path/to/memories"

# List available backups
node dist/migration/migrate-entities.js --type=memory --list-backups

# Restore from specific backup
node dist/migration/migrate-entities.js --type=memory --restore=backup-20250101-120000
```

#### Task Migration Commands (Future)
```bash
# Migrate tasks with dependency validation
node dist/migration/migrate-entities.js --type=task --source="/path/to/tasks" --backup --validate-dependencies

# Migrate with hierarchy preservation
node dist/migration/migrate-entities.js --type=task --preserve-hierarchy --max-depth=10

# Split tasks by project during migration
node dist/migration/migrate-entities.js --type=task --split-strategy=by-project

# Migrate all entity types
node dist/migration/migrate-entities.js --type=all --backup --validate
```

#### Migration Monitoring Commands
```bash
# Check migration status
node dist/migration/migration-status.js --type=memory

# Generate migration report
node dist/migration/migration-report.js --type=memory --output=report.html

# Benchmark migration performance
node dist/migration/benchmark-migration.js --type=memory --test-size=1000
```

## Migration Process Workflows

### Memory Migration Workflow
```bash
# 1. Pre-migration analysis
migrate-entities --type=memory --dry-run --verbose

# 2. Create backup and migrate
migrate-entities --type=memory --backup --validate

# 3. Verify migration
validate-entities --type=memory --source=.agentic-tools-mcp/memories

# 4. If issues found, rollback
migrate-entities --type=memory --rollback
```

### Task Migration Workflow (Future)
```bash
# 1. Analyze current task structure
migrate-entities --type=task --dry-run --validate-dependencies

# 2. Migrate with relationship validation
migrate-entities --type=task --backup --preserve-hierarchy --validate

# 3. Verify complex relationships
validate-entities --type=task --check-relationships --check-hierarchy

# 4. Performance verification
test-migration --type=task --benchmark
```

## Migration Safety Features

### Backup and Recovery
1. **Automatic Backups**: Every migration creates timestamped backups
2. **Incremental Backups**: Only backup changed files on subsequent runs
3. **Backup Verification**: Verify backup integrity before migration
4. **One-Click Rollback**: Simple rollback to any backup point
5. **Backup Cleanup**: Automatic cleanup of old backups based on policy

### Validation and Integrity
1. **Pre-Migration Validation**: Check source data integrity
2. **Real-Time Validation**: Validate each entity during migration
3. **Post-Migration Validation**: Comprehensive validation after completion
4. **Relationship Validation**: Ensure all relationships are preserved
5. **Content Verification**: Verify no data loss during transformation

### Error Handling and Recovery
1. **Graceful Failure**: Continue migration even if individual entities fail
2. **Error Reporting**: Detailed error logs with suggestions
3. **Partial Migration Support**: Resume interrupted migrations
4. **Conflict Resolution**: Handle file naming conflicts automatically
5. **Data Corruption Detection**: Detect and report data corruption

## Migration Timeline and Dependencies

### Prerequisites
- Core markdown storage system implemented and tested
- Schema validation system functional
- Generic storage factory operational
- All unit tests passing for new storage system

### Phase 1: Framework and Memory Migration (8-10 hours)
- **Step 1**: Generic migration framework (3-4 hours)
- **Step 2**: Memory migration implementation (3-4 hours)
- **Step 3**: Testing and validation (2-3 hours)

### Phase 2: Task Migration (Future - 6-8 hours)
- **Step 1**: Task migration strategy (3-4 hours)
- **Step 2**: Relationship migration (2-3 hours)
- **Step 3**: Testing and validation (2-3 hours)

### Phase 3: Tools and Polish (4-6 hours)
- **Step 1**: Universal CLI tools (2-3 hours)
- **Step 2**: Reporting and monitoring (1-2 hours)
- **Step 3**: Documentation and examples (1-2 hours)

**Total Migration Implementation Time**: 18-24 hours

## Success Criteria

### Memory Migration Success
- [ ] 100% of JSON memories converted to markdown format
- [ ] All metadata preserved in frontmatter
- [ ] Content integrity maintained (no data loss)
- [ ] Search functionality works with migrated data
- [ ] File naming follows new conventions
- [ ] Category structure preserved
- [ ] Backup and rollback functionality tested

### Task Migration Success (Future)
- [ ] All projects and tasks converted to markdown
- [ ] Task hierarchies preserved exactly
- [ ] All dependencies maintained and validated
- [ ] Project-task relationships intact
- [ ] Performance equals or exceeds original system
- [ ] Complex queries work correctly
- [ ] No circular dependencies introduced

### Overall Migration Success
- [ ] Zero data loss across all entity types
- [ ] Migration completes within reasonable time
- [ ] All relationships and integrity constraints maintained
- [ ] Rollback capability verified
- [ ] Users can continue working seamlessly after migration
- [ ] Performance benchmarks met or exceeded

## Risk Mitigation

### Data Loss Prevention
- Mandatory backups before any migration
- Atomic operations where possible
- Validation at every step
- Rollback capability always available

### Performance Concerns
- Batch processing for large datasets
- Progress monitoring and reporting
- Interruption and resume capability
- Memory-efficient processing

### Relationship Integrity
- Comprehensive relationship validation
- Circular dependency detection
- Orphaned entity detection and handling
- Cross-reference verification

This migration plan provides a comprehensive strategy for safely transitioning from JSON to markdown storage while maintaining data integrity and system performance.
