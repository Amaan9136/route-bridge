# Setup Guide

Complete instructions for setting up the route-bridge monorepo locally.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 | https://nodejs.org |
| pnpm | ≥ 8 | `npm install -g pnpm` |
| Python | ≥ 3.9 | https://python.org |
| pip | latest | bundled with Python |

## 1. Clone and install

```bash
git clone https://github.com/Amaan9136/route-bridge
cd route-bridge

# Install all Node packages across the monorepo
pnpm install
```

## 2. Build all packages

```bash
pnpm build
```

This compiles every TypeScript package in dependency order. Outputs go to each package's `dist/` directory.

Build a single package:

```bash
pnpm --filter @route-bridge/core build
pnpm --filter @route-bridge/generator build
```

## 3. Run tests

```bash
# All Node packages
pnpm test

# Single package
pnpm --filter @route-bridge/core test
pnpm --filter @route-bridge/generator test
```

Python tests:

```bash
cd python
pip install -e ".[dev]"
pytest
```

## 4. Run the Express demo

```bash
# Terminal 1 - start the backend
cd examples/express-next/backend
pnpm install
pnpm dev
# Server running at http://localhost:3001
# Manifest written to route-bridge.manifest.json

# Terminal 2 - generate the frontend client
cd examples/express-next/backend
pnpm generate
# → ../frontend/lib/generated/client.ts

# Terminal 3 - start the Next.js frontend
cd examples/express-next/frontend
pnpm install
pnpm dev
# Frontend at http://localhost:3000
```

## 5. Run the Flask demo

```bash
# Terminal 1 - start the backend
cd examples/flask-next/backend
pip install -r requirements.txt
make dev
# Server running at http://localhost:3001
# Manifest written to route-bridge.manifest.json

# Terminal 2 - generate the frontend client
cd examples/flask-next/backend
make generate
# → ../frontend/lib/generated/client.ts

# Terminal 3 - start the Next.js frontend
cd examples/flask-next/frontend
pnpm install
pnpm dev
# Frontend at http://localhost:3000
```

## 6. Use the scaffolder locally

After building, link the packages:

```bash
pnpm build

# Run the scaffolder directly
node packages/create-route-bridge-app/dist/cli.js
```

Or link globally:

```bash
cd packages/create-route-bridge-app
npm link
create-route-bridge-app
```

## 7. Iterate on the generator

If you change the generator, rebuild and test end-to-end:

```bash
pnpm --filter @route-bridge/generator build

# Then regenerate from an example manifest
node packages/generator/dist/cli.js generate \
  --manifest examples/express-next/backend/route-bridge.manifest.json \
  --output /tmp/generated-client

cat /tmp/generated-client/client.ts
```

## Directory reference

```
route-bridge/
  packages/
    core/            Manifest types + path utilities         (@route-bridge/core)
    config/          defineConfig / validateConfig           (@route-bridge/config)
    logger/          createLogger / pretty terminal output   (@route-bridge/logger)
    client/          Runtime fetch helpers                   (@route-bridge/client)
    express/         Express defineRoute + router            (@route-bridge/express)
    generator/       Manifest → TypeScript client            (@route-bridge/generator)
    create-route-bridge-app/  npx scaffolder               (create-route-bridge-app)
  python/
    flask_route_bridge/  Flask RouteBridge + decorator
    tests/               pytest suite
  examples/
    express-next/    Express backend + Next.js frontend
    flask-next/      Flask backend + Next.js frontend
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Controls logging defaults |
| `PORT` | `3001` | Backend port |
| `ROUTE_BRIDGE_BASE_URL` | `http://localhost:3001` | Backend base URL |
| `ROUTE_BRIDGE_OUTPUT_DIR` | `./src/generated` | Generator output directory |
| `ROUTE_BRIDGE_MANIFEST_PATH` | `./route-bridge.manifest.json` | Manifest location |
| `ROUTE_BRIDGE_DEBUG` | `true` in dev | Enable debug logging |
| `ROUTE_BRIDGE_LOGGING` | `true` | Enable request logging |
| `FLASK_DEBUG` | `0` | Enables Flask debug + route-bridge logging |
