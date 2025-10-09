# Testing Guide

This document provides comprehensive information about the testing strategy and practices for the `create-openfort` CLI tool.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The test suite uses [Vitest](https://vitest.dev/) as the testing framework, chosen for its:
- ⚡ Fast execution with native ESM support
- 🔧 Easy configuration
- 🎯 Jest-compatible API
- 📊 Built-in coverage reporting
- 🎨 Beautiful UI for test exploration

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Test Structure

```
src/__tests__/
├── __fixtures__/              # Shared test data
│   ├── env-examples.ts       # Sample environment files
│   └── package-names.ts      # Package name test cases
├── setup.ts                  # Global test setup
├── utils.test.ts             # Utility function tests
├── FileManager.test.ts       # FileManager class tests
├── template.test.ts          # Template selection tests
├── args.test.ts              # CLI argument parsing tests
├── cloneRepo.test.ts         # Git operations tests
├── integration.test.ts       # Integration tests
└── README.md                 # Test documentation
```

## Running Tests

### Basic Commands

```bash
# Run all tests once
yarn test

# Run tests in watch mode (development)
yarn test:watch

# Run tests with UI
yarn test:ui

# Run tests with coverage
yarn test:coverage

# Run integration test (real CLI)
yarn test:integration
```

### Running Specific Tests

```bash
# Run a specific test file
yarn test FileManager.test.ts

# Run tests matching a pattern
yarn test -t "should format target directory"

# Run tests in a specific directory
yarn test src/__tests__/
```

### Debugging Tests

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/vitest run

# Run with verbose output
yarn test --reporter=verbose

# Run with DOM output for failed tests
yarn test --reporter=verbose --reporter=html
```

## Writing Tests

### Test Structure

Follow the Arrange-Act-Assert (AAA) pattern:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('specificFunction', () => {
    it('should handle the happy path', () => {
      // Arrange: Set up test data and mocks
      const input = 'test-value'
      
      // Act: Execute the function
      const result = specificFunction(input)
      
      // Assert: Verify the result
      expect(result).toBe('expected-value')
    })

    it('should handle edge cases', () => {
      // Test boundary conditions
      expect(specificFunction('')).toBe('')
      expect(specificFunction(null)).toBe(null)
    })

    it('should throw on invalid input', () => {
      // Test error scenarios
      expect(() => specificFunction(undefined)).toThrow('Invalid input')
    })
  })
})
```

### Mocking

#### Mocking Modules

```typescript
import { vi } from 'vitest'
import fs from 'node:fs'

vi.mock('node:fs')

// Use the mocked module
vi.mocked(fs.readFileSync).mockReturnValue('mocked content')
```

#### Mocking Functions

```typescript
const mockCallback = vi.fn()
mockCallback.mockReturnValue('result')
mockCallback.mockResolvedValue('async result')
mockCallback.mockRejectedValue(new Error('error'))
```

#### Spying on Functions

```typescript
const spy = vi.spyOn(console, 'log')
// ... test code ...
expect(spy).toHaveBeenCalledWith('expected message')
spy.mockRestore()
```

### Using Fixtures

```typescript
import { BASIC_ENV_EXAMPLE } from './__fixtures__/env-examples'

it('should parse env file', () => {
  vi.mocked(fs.readFileSync).mockReturnValue(BASIC_ENV_EXAMPLE)
  // ... test with fixture
})
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const promise = asyncFunction()
  await expect(promise).resolves.toBe('result')
})

it('should handle rejections', async () => {
  const promise = asyncFunction()
  await expect(promise).rejects.toThrow('error')
})
```

## Best Practices

### ✅ Do

1. **Write descriptive test names**
   ```typescript
   it('should remove trailing slashes from directory path')
   ```

2. **Test one thing per test**
   ```typescript
   it('should validate email format')
   it('should reject empty email')
   ```

3. **Use beforeEach for setup**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks()
   })
   ```

4. **Mock external dependencies**
   ```typescript
   vi.mock('node:fs')
   vi.mock('node:child_process')
   ```

5. **Test edge cases and errors**
   ```typescript
   it('should handle empty string')
   it('should throw on null input')
   ```

6. **Keep tests isolated**
   - Don't depend on other tests
   - Reset state between tests
   - Use mocks to isolate units

7. **Use meaningful assertions**
   ```typescript
   expect(result).toBe('expected')
   expect(array).toHaveLength(3)
   expect(fn).toHaveBeenCalledWith('arg')
   ```

### ❌ Don't

1. **Don't test implementation details**
   - Test behavior, not internal implementation
   
2. **Don't write flaky tests**
   - Avoid time-dependent tests
   - Don't rely on external services

3. **Don't test third-party libraries**
   - Trust that dependencies are tested
   - Mock them instead

4. **Don't make tests too complex**
   - If a test is hard to write, refactor the code
   
5. **Don't ignore failing tests**
   - Fix or remove broken tests
   - Don't use `.skip()` as a permanent solution

## Test Categories

### Unit Tests
Test individual functions and methods in isolation.

**Example**: `utils.test.ts`, `template.test.ts`

### Integration Tests
Test how multiple components work together.

**Example**: `integration.test.ts`

### Component Tests
Test class instances with their dependencies mocked.

**Example**: `FileManager.test.ts`

## Continuous Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests

### CI Configuration

The GitHub Actions workflow (`.github/workflows/test.yml`):
- Runs on Ubuntu, macOS, and Windows
- Tests Node.js versions 18, 20, and 22
- Generates coverage reports
- Uploads coverage to Codecov

### Local CI Simulation

```bash
# Simulate CI locally
yarn lint && yarn test
```

## Coverage Reports

### Viewing Coverage

```bash
# Generate coverage report
yarn test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Output

```
-----------------|---------|----------|---------|---------|
File             | % Stmts | % Branch | % Funcs | % Lines |
-----------------|---------|----------|---------|---------|
All files        |   85.23 |    78.92 |   88.24 |   85.67 |
 FileManager.ts  |   92.45 |    85.71 |   94.12 |   92.86 |
 utils.ts        |   88.89 |    76.47 |   85.71 |   89.47 |
 template.ts     |   76.92 |    70.00 |   80.00 |   77.78 |
-----------------|---------|----------|---------|---------|
```

### Improving Coverage

1. **Identify uncovered lines**
   ```bash
   yarn test:coverage
   # Check coverage/index.html
   ```

2. **Add tests for missing paths**
   - Error handling branches
   - Edge cases
   - Optional parameters

3. **Refactor untestable code**
   - Extract pure functions
   - Inject dependencies
   - Simplify complex logic

## Troubleshooting

### Tests Failing Locally

1. **Clear cache**
   ```bash
   yarn test --clearCache
   ```

2. **Update dependencies**
   ```bash
   yarn install
   ```

3. **Check Node version**
   ```bash
   node --version  # Should be 18+
   ```

### Mock Not Working

1. **Ensure mock is called before import**
   ```typescript
   vi.mock('module')  // Must be at top level
   import { function } from 'module'
   ```

2. **Reset mocks between tests**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks()
   })
   ```

### Async Tests Timing Out

1. **Increase timeout**
   ```typescript
   it('slow test', async () => {
     // test code
   }, 10000) // 10 second timeout
   ```

2. **Ensure promises are awaited**
   ```typescript
   await asyncFunction()
   ```

### Import Errors

1. **Check tsconfig.json paths**
2. **Verify module exports**
3. **Use correct import syntax**
   ```typescript
   import { named } from 'module'
   import * as namespace from 'module'
   ```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest Matchers](https://jestjs.io/docs/expect) (compatible with Vitest)

## Contributing

When adding new features:

1. ✅ Write tests first (TDD)
2. ✅ Ensure all tests pass
3. ✅ Maintain coverage above 80%
4. ✅ Update test documentation if needed
5. ✅ Add integration tests for critical paths

## Questions?

If you have questions about testing:
1. Check this document
2. Review existing tests
3. Ask in pull request reviews
4. Open an issue for clarification

