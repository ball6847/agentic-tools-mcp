# Markdown Storage Testing Plan

## Overview

This plan outlines comprehensive testing strategies for the markdown-based storage system. Testing should be implemented after the core storage system is functional and before any migration activities.

## Testing Architecture

### Test Structure
```
tests/
├── shared/
│   ├── storage/
│   │   ├── markdown-storage.test.ts
│   │   └── index-manager.test.ts
│   ├── utils/
│   │   ├── markdown-utils.test.ts
│   │   └── relationship-utils.test.ts
│   └── schemas/
│       ├── memory-schema.test.ts
│       └── base-schema.test.ts
├── features/
│   └── agent-memories/
│       └── storage/
│           └── memory-markdown-storage.test.ts
└── integration/
    ├── end-to-end-storage.test.ts
    └── backward-compatibility.test.ts
```

## Testing Dependencies

### Setup Commands
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @types/node

# Initialize Jest configuration
npx ts-jest config:init
```

### Jest Configuration
**File**: `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

## Unit Testing Strategy

### Phase 1: Core Infrastructure Tests

#### Generic MarkdownStorage Tests
**File**: `tests/shared/storage/markdown-storage.test.ts`

**Test Coverage**:
- Entity creation with valid frontmatter
- Entity retrieval by ID
- Entity updates (content and metadata)
- Entity deletion
- Search functionality
- Index management
- File naming and sanitization
- Error handling for invalid data
- Schema validation

#### Utility Function Tests
**File**: `tests/shared/utils/markdown-utils.test.ts`

**Test Coverage**:
- Markdown parsing with frontmatter
- Markdown generation from entities
- File name sanitization
- Search token generation
- Content validation

**File**: `tests/shared/utils/relationship-utils.test.ts`

**Test Coverage**:
- Relationship resolution
- Hierarchy validation
- Dependency graph building
- Circular dependency detection

### Phase 2: Memory-Specific Tests

#### Memory Storage Adapter Tests
**File**: `tests/features/agent-memories/storage/memory-markdown-storage.test.ts`

**Test Coverage**:
- Memory CRUD operations
- Category-based organization
- Search across memories
- Backward compatibility with JSON
- Memory-specific validation
- Tag-based filtering

#### Schema Validation Tests
**File**: `tests/shared/schemas/memory-schema.test.ts`

**Test Coverage**:
- Valid frontmatter parsing
- Invalid data rejection
- Required field validation
- Optional field handling
- Type conversion and validation

## Integration Testing Strategy

### End-to-End Storage Tests
**File**: `tests/integration/end-to-end-storage.test.ts`

**Test Scenarios**:
```typescript
describe('End-to-End Storage Operations', () => {
  it('should create, read, update, delete memory entities', async () => {
    // Test complete CRUD workflow
  });

  it('should maintain index consistency across operations', async () => {
    // Test index updates with entity changes
  });

  it('should handle concurrent operations safely', async () => {
    // Test thread safety and file locking
  });

  it('should preserve data integrity during bulk operations', async () => {
    // Test batch operations
  });
});
```

### Backward Compatibility Tests
**File**: `tests/integration/backward-compatibility.test.ts`

**Test Scenarios**:
- Reading existing JSON memory files
- Mixed JSON and markdown operations
- Legacy data format support
- Graceful degradation

## Performance Testing

### Benchmark Tests
**File**: `tests/performance/storage-benchmarks.test.ts`

**Performance Metrics**:
- Entity creation speed
- Search performance with large datasets
- Index building time
- Memory usage patterns
- File I/O efficiency

**Test Data Sets**:
- Small: 10-50 entities
- Medium: 100-500 entities
- Large: 1000+ entities

### Memory Usage Tests
- Monitor memory consumption during operations
- Test for memory leaks in long-running operations
- Validate garbage collection efficiency

## Test Data Management

### Test Fixtures
**Directory**: `tests/fixtures/`

**Sample Data**:
```
tests/fixtures/
├── memories/
│   ├── valid-memory.md
│   ├── invalid-frontmatter.md
│   └── legacy-memory.json
├── schemas/
│   ├── valid-schemas.ts
│   └── invalid-schemas.ts
└── index-data/
    ├── sample-index.json
    └── corrupted-index.json
```

### Test Database Setup
```typescript
// Setup clean test environment
beforeEach(async () => {
  await setupTestDirectory();
  await seedTestData();
});

// Cleanup after tests
afterEach(async () => {
  await cleanupTestDirectory();
});
```

## Error Handling Tests

### Validation Error Tests
- Invalid frontmatter format
- Missing required fields
- Type validation failures
- Schema version mismatches

### File System Error Tests
- Permission denied scenarios
- Disk full conditions
- Corrupted file handling
- Network drive disconnection

### Concurrent Access Tests
- Multiple processes accessing same files
- File locking behavior
- Race condition prevention
- Data corruption prevention

## Testing Commands

### Basic Testing Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test -- markdown-storage.test.ts

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run integration tests only
npm test -- --testPathPattern=integration

# Run performance tests
npm test -- --testPathPattern=performance
```

### Advanced Testing Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests for specific feature
npm test -- --testPathPattern=agent-memories

# Generate coverage report
npm test -- --coverage --coverageDirectory=coverage

# Run tests with specific timeout
npm test -- --testTimeout=10000
```

## Quality Gates

### Code Coverage Requirements
- **Minimum Coverage**: 85% line coverage
- **Critical Paths**: 100% coverage for data persistence
- **Error Handling**: 90% coverage for error scenarios

### Performance Benchmarks
- **Entity Creation**: < 10ms per entity
- **Search Operations**: < 100ms for 1000 entities
- **Index Building**: < 500ms for 1000 entities
- **Memory Usage**: < 50MB for 1000 entities

### Reliability Standards
- **Zero Data Loss**: All operations must preserve data integrity
- **Atomic Operations**: All write operations must be atomic
- **Crash Recovery**: System must recover from unexpected shutdowns

## Continuous Integration

### GitHub Actions Configuration
**File**: `.github/workflows/test.yml`
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit test hook
npx husky add .husky/pre-commit "npm test"
```

## Timeline Estimate

- **Phase 1**: Unit tests (6-8 hours)
- **Phase 2**: Integration tests (4-6 hours)
- **Phase 3**: Performance tests (3-4 hours)
- **Phase 4**: CI/CD setup (2-3 hours)

**Total Testing Implementation Time**: 15-21 hours

## Success Criteria

- [ ] All unit tests pass with 85%+ coverage
- [ ] Integration tests validate end-to-end workflows
- [ ] Performance benchmarks meet requirements
- [ ] Backward compatibility maintained
- [ ] Error handling comprehensive
- [ ] CI/CD pipeline functional
- [ ] Documentation for test maintenance

This testing plan ensures comprehensive validation of the markdown storage system before deployment and provides ongoing quality assurance for future development.
