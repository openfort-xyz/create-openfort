# Create Openfort

A CLI tool for scaffolding new Openfort projects with best practices and modern tooling.

## Usage

```sh
pnpm create openfort
# or
npm create openfort
```

## Development

### Prerequisites

- Node.js >=22.9 (LTS recommended)
- pnpm 10.16.1

### Getting Started

1. **Install dependencies**

   ```sh
   pnpm install
   ```

2. **Build with watch mode**

   ```sh
   pnpm dev
   ```

3. **Test your changes**

   ```sh
   pnpm test
   # or with watch mode
   pnpm test:watch
   ```

### Available Scripts

```sh
# Development
pnpm dev                # Build in watch mode
pnpm test               # Run tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Generate coverage report

# Code Quality
pnpm check              # Lint and format with Biome
pnpm check:types        # Type check with TypeScript
pnpm check:unused       # Check for unused code with Knip

# Building
pnpm build              # Production build
pnpm clean              # Clean build artifacts

# Release Management
pnpm changeset          # Create a changeset for release
```

## Project Structure

This is a monorepo managed with pnpm workspaces:

```
create-openfort/
├── packages/
│   └── create-openfort/    # Main CLI package
├── .changeset/             # Changeset configuration
├── .github/                # GitHub workflows
│   ├── actions/            # Reusable actions
│   └── workflows/          # CI/CD workflows
├── biome.json              # Biome configuration
└── pnpm-workspace.yaml     # pnpm workspace config
```

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork and clone the repository**

2. **Create a new branch**
   ```sh
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write tests for new features
   - Ensure code coverage stays above 80%
   - Follow the code style (enforced by Biome)

4. **Run quality checks**
   ```sh
   pnpm check              # Format and lint
   pnpm check:types        # Type check
   pnpm test               # Run tests
   ```

5. **Create a changeset**
   ```sh
   pnpm changeset
   ```
   Follow the prompts to describe your changes.

6. **Commit your changes**
   ```sh
   git commit -m "feat: your feature description"
   ```
   Note: Pre-commit hooks will automatically run `pnpm check`

7. **Push and create a Pull Request**
   ```sh
   git push origin feature/your-feature-name
   ```

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management:

1. Developer creates PR with changes and a changeset
2. PR is reviewed and merged to `main`
3. GitHub Actions automatically creates a "Version Package" PR
4. When merged, the package is published to NPM automatically

## Resources

- [Openfort Documentation](https://www.openfort.xyz/docs)
- [Openfort GitHub](https://github.com/openfort-xyz)
