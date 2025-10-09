# Test Suite Documentation

This directory contains comprehensive tests for the `create-openfort` CLI tool.

## 📁 Test Structure

```
__tests__/
├── __fixtures__/          # Test data and fixtures
│   ├── env-examples.ts   # Sample .env files for testing
│   └── package-names.ts  # Package name validation fixtures
├── setup.ts              # Test setup and global mocks
├── utils.test.ts         # Tests for utility functions
├── FileManager.test.ts   # Tests for FileManager class
├── template.test.ts      # Tests for template selection
├── args.test.ts          # Tests for CLI argument parsing
├── cloneRepo.test.ts     # Tests for git repository operations
└── integration.test.ts   # End-to-end integration tests
```

## 🚀 Running Tests

### Run all tests
```bash
yarn test
# or
npm test
```

### Run tests in watch mode (for development)
```bash
yarn test:watch
# or
npm run test:watch
```

### Run tests with UI (interactive)
```bash
yarn test:ui
# or
npm run test:ui
```

### Run tests with coverage report
```bash
yarn test:coverage
# or
npm run test:coverage
```

### Run integration test (real CLI execution)
```bash
yarn test:integration
# or
npm run test:integration
```

## 📋 Test Coverage

The test suite covers:

### 1. **Utils Tests** (`utils.test.ts`)
- ✅ `formatTargetDir` - Directory name formatting
- ✅ `pkgFromUserAgent` - Package manager detection
- ✅ `getFullCustomCommand` - Command transformation for different package managers

### 2. **FileManager Tests** (`FileManager.test.ts`)
- ✅ `isValidPackageName` - Package name validation
- ✅ `toValidPackageName` - Package name conversion
- ✅ `isEmpty` - Directory emptiness check
- ✅ `emptyDir` - Directory cleanup
- ✅ `editFile` - File content transformation
- ✅ `copyDir` - Recursive directory copying
- ✅ FileManager class methods:
  - Constructor and initialization
  - `getFilePath` - Path resolution
  - `write` - File writing
  - `read` - File reading
  - `addEnv` - Environment variable management
  - `isInitialized` - Initialization check
  - `outro` - Final message generation

### 3. **Template Tests** (`template.test.ts`)
- ✅ Template constants validation
- ✅ Template selection prompts
- ✅ Invalid template handling
- ✅ Available templates filtering
- ✅ User cancellation handling

### 4. **CLI Arguments Tests** (`args.test.ts`)
- ✅ Template argument parsing (`--template`, `-t`)
- ✅ Boolean flags (`--overwrite`, `--help`, `--version`, etc.)
- ✅ String options (`--dashboard`)
- ✅ Negation flags (`--no-validate`, `--no-telemetry`)
- ✅ Positional arguments (target directory)
- ✅ Combined arguments
- ✅ Path handling (relative, absolute, with spaces)

### 5. **Clone Repo Tests** (`cloneRepo.test.ts`)
- ✅ npx degit command execution
- ✅ Successful clone handling
- ✅ Error handling
- ✅ Verbose logging
- ✅ stdout/stderr capture

### 6. **Integration Tests** (`integration.test.ts`)
- ✅ Full frontend project creation flow
- ✅ Full-stack project creation flow
- ✅ Error handling scenarios
- ✅ Environment variable edge cases
- ✅ Package manager detection

## 🎯 Key Test Patterns

### Mocking
Tests use Vitest's mocking capabilities to simulate:
- File system operations (`fs` module)
- Child processes (`child_process` module)
- User prompts (`@clack/prompts`)

### Fixtures
Test fixtures provide reusable test data:
- Sample `.env` files with various configurations
- Valid and invalid package names
- Edge cases and special scenarios

### Isolation
Each test is isolated using:
- `beforeEach` hooks to reset mocks
- `afterEach` hooks to clean up
- Mock resets between tests

## 🐛 Debugging Tests

### Run a specific test file
```bash
yarn test utils.test.ts
```

### Run a specific test case
```bash
yarn test -t "should format target directory"
```

### Debug with breakpoints
```bash
node --inspect-brk node_modules/.bin/vitest run
```

## 📊 Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## 🔧 Configuration

Test configuration is defined in `vitest.config.ts` at the package root.

Key settings:
- Test environment: Node.js
- Setup file: `src/__tests__/setup.ts`
- Coverage provider: v8
- Mock reset: Automatic after each test

## 📝 Writing New Tests

When adding new tests:

1. **Place tests in the correct file** based on what's being tested
2. **Use descriptive test names** that explain what is being tested
3. **Follow the AAA pattern**: Arrange, Act, Assert
4. **Mock external dependencies** to isolate the unit under test
5. **Clean up after tests** to avoid side effects
6. **Add fixtures** for complex test data
7. **Test edge cases** and error scenarios

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { functionToTest } from '../path/to/module'

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
    vi.clearAllMocks()
  })

  describe('functionToTest', () => {
    it('should handle the happy path', () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = functionToTest(input)
      
      // Assert
      expect(result).toBe('expected')
    })

    it('should handle edge cases', () => {
      // Test edge cases
    })

    it('should throw on invalid input', () => {
      // Test error handling
      expect(() => functionToTest(null)).toThrow()
    })
  })
})
```

## 🚨 Common Issues

### Tests failing due to mock issues
- Ensure mocks are reset in `beforeEach`
- Check that all dependencies are properly mocked

### Import errors
- Verify that the module paths are correct
- Check that exports are available

### Async test timeouts
- Ensure all promises are properly awaited
- Consider increasing test timeout for slow operations

## 🤝 Contributing

When contributing tests:
1. Ensure all tests pass: `yarn test`
2. Maintain or improve coverage: `yarn test:coverage`
3. Follow existing test patterns
4. Add documentation for complex test scenarios

