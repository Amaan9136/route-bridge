# Contributing to route-bridge

Thanks for your interest in contributing!

## Repository structure

```
route-bridge/
  packages/          TypeScript packages (pnpm workspaces)
  python/            Python package (pip)
  examples/          Working demo apps
```

## Setup

```bash
# Node packages
npm install -g pnpm
pnpm install
pnpm build

# Python package (optional)
cd python
pip install -e ".[dev]"
```

## Workflow

1. Make your changes
2. Run tests: `pnpm test`
3. Build: `pnpm build`
4. Open a PR with a clear description

## Adding a new npm package

1. Create `packages/<name>/`
2. Add `package.json` with `"name": "@route-bridge/<name>"`
3. Add `tsconfig.json` extending `../../tsconfig.base.json`
4. Add entry in root `pnpm-workspace.yaml` if needed
5. Run `pnpm install` from root

## Manifest format changes

The manifest schema lives in `packages/core/src/index.ts`. Any change there affects
both Express and Flask integrations and the generator. Update all three when changing
the manifest shape, and bump the `version` field if the change is breaking.

## Code style

- TypeScript: strict mode, no `any` unless absolutely unavoidable
- Python: type hints preferred, PEP 8
- Prefer functional style over classes where it's cleaner
- Keep public API surface small

## Releasing

See the Publishing section of README.md.
