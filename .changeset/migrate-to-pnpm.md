---
"create-openfort": minor
---

Migrate from Yarn to pnpm and add modern development tooling

**Breaking Changes:**
- Node.js >=22.9 now required
- pnpm 10.16.1 is now the only supported package manager
- `yarn lint` command replaced with `pnpm check`

**New Features:**
- Added Biome for fast linting and formatting
- Added Knip for unused code detection
- Added Changesets for automated release management
- Added simple-git-hooks for pre-commit checks
- Comprehensive GitHub Actions workflows for CI/CD

**Migration Steps:**
```bash
rm -rf node_modules .yarn yarn.lock
corepack enable && corepack prepare pnpm@10.16.1 --activate
pnpm install
```

See AGENTS.md for complete documentation of the new tooling and workflow.

