# AGENTS.md

## Project Overview

`create-openfort` is a CLI tool for scaffolding new Openfort projects. It's a monorepo managed with Yarn workspaces that provides an interactive CLI to help developers quickly bootstrap Openfort applications.

## Setup Commands

- Install dependencies: `yarn`
- Start development mode: `yarn dev`
- Run all tests: `yarn test`
- Build all packages: `yarn build`
- Run linter: `yarn lint`

### Package-Specific Commands

When working in the `packages/create-openfort` directory:

- Build with watch mode: `yarn dev` (uses unbuild)
- Run tests: `yarn test`
- Run tests in watch mode: `yarn test:watch`
- Run tests with UI: `yarn test:ui`
- Generate coverage report: `yarn test:coverage`
- Run integration test: `yarn test:integration`
- Type checking: `yarn lint`

## Project Structure

```
create-openfort/
├── packages/
│   └── create-openfort/          # Main CLI package
│       ├── src/
│       │   ├── cli/              # CLI-related modules
│       │   │   ├── args.ts       # Argument parsing
│       │   │   ├── colors.ts     # Terminal colors
│       │   │   ├── FileManager.ts # File operations
│       │   │   ├── index.ts      # CLI entry point
│       │   │   ├── prompts.ts    # Interactive prompts
│       │   │   ├── telemetry.ts  # Analytics
│       │   │   ├── template.ts   # Template handling
│       │   │   ├── utils.ts      # Utilities
│       │   │   └── verboseLevel.ts # Logging levels
│       │   ├── __tests__/        # Test files
│       │   │   ├── __fixtures__/ # Shared test data
│       │   │   ├── setup.ts      # Global test setup
│       │   │   └── *.test.ts     # Test files
│       │   ├── index.ts          # Package entry
│       │   └── version.ts        # Version info
│       ├── dist/                 # Build output
│       ├── index.js              # CLI executable
│       └── package.json
├── package.json                  # Root package.json
└── README.md
```

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js ^18.0.0 || ^20.0.0 || >=22.0.0
- **Package Manager**: Yarn 4.9.1 (workspaces enabled)
- **Build Tool**: unbuild
- **Testing Framework**: Vitest
- **CLI Framework**: @clack/prompts
- **Dependencies**: 
  - cross-spawn (process spawning)
  - mri (argument parsing)
  - picocolors (terminal colors)
  - node-fetch (HTTP requests)

## Code Style

- TypeScript with strict mode enabled
- ESM modules (type: "module" in package.json)
- Use async/await for asynchronous operations
- Descriptive variable and function names
- Keep functions small and focused
- Follow existing patterns in the codebase

## Testing Instructions

### Test Framework

The project uses **Vitest** for all testing. Tests are located in `src/__tests__/`.

### Running Tests

```bash
# From root
yarn test

# From packages/create-openfort
yarn test                    # Run all tests once
yarn test:watch              # Watch mode for development
yarn test:ui                 # Open Vitest UI
yarn test:coverage           # Generate coverage report
yarn test:integration        # Run real CLI integration test
```

### Running Specific Tests

```bash
# Run a specific test file
yarn test FileManager.test.ts

# Run tests matching a pattern
yarn test -t "should format target directory"
```

### Coverage Goals

Maintain these minimum coverage thresholds:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View coverage report: `yarn test:coverage` then open `coverage/index.html`

### Writing Tests

- Follow the Arrange-Act-Assert (AAA) pattern
- Test one thing per test
- Use descriptive test names (e.g., "should remove trailing slashes from directory path")
- Mock external dependencies (fs, child_process, etc.) using `vi.mock()`
- Use fixtures from `__tests__/__fixtures__/` for test data
- Always reset mocks in `beforeEach()` with `vi.clearAllMocks()`
- Test edge cases and error scenarios

### Test Categories

1. **Unit Tests**: Test individual functions (utils.test.ts, template.test.ts)
2. **Integration Tests**: Test component interactions (integration.test.ts)
3. **Component Tests**: Test class instances (FileManager.test.ts)

## Build Process

- **Development**: `yarn dev` - Uses unbuild in watch mode
- **Production**: `yarn build` - Runs unbuild then post-build script (build.js)
- Output directory: `dist/`
- Entry point: `index.js` (CLI executable with shebang)

## Development Workflow

1. Make changes in `src/`
2. Run `yarn dev` for watch mode
3. Test changes with `yarn test` or `yarn test:watch`
4. Verify types with `yarn lint`
5. Ensure all tests pass before committing
6. Check coverage is maintained above 80%

## Debugging

- Use `yarn test:ui` for interactive test debugging
- Use `yarn test:watch` to re-run tests on file changes
- Check build output in `dist/` directory
- Use `yarn test:integration` to test the CLI in a real environment

## Environment

- **Git Branch**: Currently on `fix/downloading-template`
- **Working Tree**: Clean (no uncommitted changes)

## Package Management

- Uses Yarn workspaces (v4.9.1)
- Main package is in `packages/create-openfort/`
- Run workspace-specific commands: `yarn workspace create-openfort run <script>`
- Install dependencies at root level: `yarn`

## CLI Usage

The built CLI can be used via:
```bash
# From npm (when published)
yarn create openfort

# Local development
node packages/create-openfort/index.js
```

## Common Tasks

### Add a new dependency
```bash
cd packages/create-openfort
yarn add <package-name>
```

### Update dependencies
```bash
yarn
```

### Clean build artifacts
```bash
rm -rf packages/create-openfort/dist
yarn build
```

### View test coverage details
```bash
yarn test:coverage
open coverage/index.html
```

## Telemetry

The CLI includes telemetry tracking (see `src/cli/telemetry.ts`). Be mindful when making changes that affect user privacy or data collection.

## Important Notes

- The project uses ESM modules exclusively - no CommonJS
- All files must have proper exports for testing
- Mock external dependencies in tests (fs, child_process, etc.)
- Keep the CLI interactive experience smooth with @clack/prompts
- Maintain backward compatibility with Node.js 18+

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [unbuild Documentation](https://github.com/unjs/unbuild)
- [@clack/prompts Documentation](https://www.npmjs.com/package/@clack/prompts)
- [TESTING.md](packages/create-openfort/TESTING.md) - Comprehensive testing guide

