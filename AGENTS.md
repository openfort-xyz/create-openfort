# AGENTS.md

## Project Overview

`create-openfort` is a CLI tool for scaffolding new Openfort projects. It's a monorepo managed with pnpm workspaces that provides an interactive CLI to help developers quickly bootstrap Openfort applications.

## Setup Commands

- Install dependencies: `pnpm install`
- Start development mode: `pnpm dev`
- Run all tests: `pnpm test`
- Run tests in watch mode: `pnpm test:watch`
- Generate coverage report: `pnpm test:coverage`
- Build all packages: `pnpm build`
- Check linting and formatting: `pnpm check`
- Check TypeScript types: `pnpm check:types`
- Check for unused code: `pnpm check:unused`
- Clean build artifacts: `pnpm clean`

### Package-Specific Commands

When working in the `packages/create-openfort` directory:

- Build with watch mode: `pnpm dev` (uses unbuild)
- Run tests: `pnpm test`
- Run tests in watch mode: `pnpm test:watch`
- Run tests with UI: `pnpm test:ui`
- Generate coverage report: `pnpm test:coverage`
- Run integration test: `pnpm test:integration`
- Type checking: `pnpm lint`

## Project Structure

```
create-openfort/
├── .changeset/               # Changeset configuration
│   ├── config.json          # Changeset settings
│   └── README.md
├── .github/
│   ├── actions/
│   │   └── install-dependencies/ # Reusable action for CI
│   └── workflows/
│       ├── verify.yml       # CI checks (lint, test, build, audit)
│       └── release.yml      # Release workflow
├── packages/
│   └── create-openfort/     # Main CLI package
│       ├── src/
│       │   ├── cli/         # CLI-related modules
│       │   │   ├── args.ts  # Argument parsing
│       │   │   ├── colors.ts # Terminal colors
│       │   │   ├── FileManager.ts # File operations
│       │   │   ├── index.ts # CLI entry point
│       │   │   ├── prompts.ts # Interactive prompts
│       │   │   ├── telemetry.ts # Analytics
│       │   │   ├── template.ts # Template handling
│       │   │   ├── utils.ts # Utilities
│       │   │   └── verboseLevel.ts # Logging levels
│       │   ├── __tests__/   # Test files
│       │   │   ├── __fixtures__/ # Shared test data
│       │   │   ├── setup.ts # Global test setup
│       │   │   └── *.test.ts # Test files
│       │   ├── index.ts     # Package entry
│       │   └── version.ts   # Version info
│       ├── dist/            # Build output
│       ├── index.js         # CLI executable
│       └── package.json
├── biome.json               # Biome configuration
├── pnpm-workspace.yaml      # pnpm workspace config
├── package.json             # Root package.json
└── README.md
```

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js >=22.9
- **Package Manager**: pnpm 10.16.1 (workspaces enabled)
- **Build Tool**: unbuild
- **Testing Framework**: Vitest
- **Linter & Formatter**: Biome
- **Unused Code Detection**: Knip
- **Release Management**: Changesets
- **Pre-commit Hooks**: simple-git-hooks
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
- Follow Biome formatting rules (single quotes, 2 space indent, 120 line width)
- Organize imports automatically

## Linting and Formatting

The project uses **Biome** for linting and formatting:

```bash
# Check and fix all issues
pnpm check

# Only check without fixing
biome check

# Format specific files
biome format --write src/
```

### Biome Configuration

Configuration is in `biome.json`:
- Line width: 120
- Indent: 2 spaces
- Quotes: single
- Semicolons: as needed
- Trailing commas: ES5
- Auto-organize imports

## Testing Instructions

### Test Framework

The project uses **Vitest** for all testing. Tests are located in `src/__tests__/`.

### Running Tests

```bash
# From root
pnpm test

# From root with watch mode
pnpm test:watch

# From root with coverage
pnpm test:coverage

# From packages/create-openfort
pnpm test                    # Run all tests once
pnpm test:watch              # Watch mode for development
pnpm test:ui                 # Open Vitest UI
pnpm test:coverage           # Generate coverage report
pnpm test:integration        # Run real CLI integration test
```

### Running Specific Tests

```bash
# Run a specific test file
pnpm test FileManager.test.ts

# Run tests matching a pattern
pnpm test -t "should format target directory"
```

### Coverage Goals

Maintain these minimum coverage thresholds:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View coverage report: `pnpm test:coverage` then open `coverage/index.html`

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

- **Development**: `pnpm dev` - Uses unbuild in watch mode
- **Production**: `pnpm build` - Runs unbuild then post-build script (build.js)
- Output directory: `dist/`
- Entry point: `index.js` (CLI executable with shebang)

## Development Workflow

1. Make changes in `src/`
2. Run `pnpm dev` for watch mode
3. Test changes with `pnpm test` or `pnpm test:watch`
4. Verify formatting with `pnpm check` (runs automatically on pre-commit)
5. Verify types with `pnpm check:types`
6. Ensure all tests pass before committing
7. Check coverage is maintained above 80%

## Pre-commit Hooks

The project uses **simple-git-hooks** for pre-commit checks:

- Automatically runs `pnpm check` before each commit
- Ensures code is formatted and linted
- Setup runs automatically after `pnpm install`

## Unused Code Detection

The project uses **Knip** to detect unused files, dependencies, and exports:

```bash
# Check for unused code
pnpm check:unused

# Check in production mode (used in CI)
pnpm knip --production
```

Configuration is in the root `package.json` under the `knip` key.

## Release Workflow

The project uses **Changesets** for version management and releases:

### Creating a Changeset

When making changes that should be included in the next release:

```bash
pnpm changeset
```

Follow the prompts to:
1. Select which packages changed (major, minor, or patch)
2. Write a summary of the changes

This creates a markdown file in `.changeset/` that will be used to generate changelogs.

### Release Process

1. Developer creates PR with changes and a changeset
2. PR is reviewed and merged to `main`
3. GitHub Actions automatically creates a "Version Package" PR
4. When the Version Package PR is merged:
   - Package versions are updated
   - CHANGELOG.md is updated
   - Package is published to NPM
   - GitHub release is created

### Manual Release Commands

```bash
# Bump versions based on changesets
pnpm changeset:version

# Publish to NPM (requires NPM token)
pnpm changeset:publish
```

## CI/CD Workflows

### Verify Workflow (`.github/workflows/verify.yml`)

Runs on all pull requests and checks:
- **Audit**: Security vulnerabilities with `pnpm audit`
- **Build**: Builds the project and checks for unused code with Knip
- **Lint**: Runs Biome checks for formatting and linting
- **TypeScript**: Type checks the entire codebase
- **Test**: Runs all tests and generates coverage

### Release Workflow (`.github/workflows/release.yml`)

Runs on pushes to `main` branch:
- Runs all verify checks
- Creates Version Package PR via Changesets
- Publishes to NPM when Version Package PR is merged

## Debugging

- Use `pnpm test:ui` for interactive test debugging
- Use `pnpm test:watch` to re-run tests on file changes
- Check build output in `dist/` directory
- Use `pnpm test:integration` to test the CLI in a real environment

## Environment

- **Git Branch**: Currently on `main`
- **Node Version**: LTS (specified in `.nvmrc`)
- **Package Manager**: pnpm 10.16.1

## Package Management

- Uses pnpm workspaces (v10.16.1)
- Main package is in `packages/create-openfort/`
- Run workspace-specific commands: `pnpm --filter create-openfort <script>`
- Install dependencies at root level: `pnpm install`

## CLI Usage

The built CLI can be used via:
```bash
# From npm (when published)
pnpm create openfort

# Local development
node packages/create-openfort/index.js
```

## Common Tasks

### Add a new dependency

```bash
# Add to root
pnpm add -w <package-name>

# Add to specific package
pnpm --filter create-openfort add <package-name>
```

### Update dependencies

```bash
pnpm install
```

### Clean build artifacts

```bash
pnpm clean
# or
rm -rf packages/create-openfort/dist
```

### View test coverage details

```bash
pnpm test:coverage
open coverage/index.html
```

### Check for unused code

```bash
pnpm check:unused
```

### Audit dependencies for vulnerabilities

```bash
pnpm audit --audit-level=moderate
```

## Telemetry

The CLI includes telemetry tracking (see `src/cli/telemetry.ts`). Be mindful when making changes that affect user privacy or data collection.

## Important Notes

- The project uses ESM modules exclusively - no CommonJS
- All files must have proper exports for testing
- Mock external dependencies in tests (fs, child_process, etc.)
- Keep the CLI interactive experience smooth with @clack/prompts
- Maintain backward compatibility with Node.js 22+
- Use pnpm exclusively (enforced via preinstall script)
- Run `pnpm check` before committing (or let pre-commit hook handle it)
- Create changesets for all user-facing changes

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [unbuild Documentation](https://github.com/unjs/unbuild)
- [@clack/prompts Documentation](https://www.npmjs.com/package/@clack/prompts)
- [Biome Documentation](https://biomejs.dev/)
- [Knip Documentation](https://knip.dev/)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [pnpm Documentation](https://pnpm.io/)
