# 🌉 route-bridge

[![npm version](https://img.shields.io/npm/v/create-route-bridge-app)](https://www.npmjs.com/package/create-route-bridge-app)
[![npm downloads](https://img.shields.io/npm/dm/create-route-bridge-app)](https://www.npmjs.com/package/create-route-bridge-app)

**Define backend routes once. Call them from the frontend as typed functions. No handwritten fetch wrappers.**

route-bridge is a contract-driven developer tool platform that connects your backend API to your frontend automatically. You define routes using small helper functions in Express or Flask, route-bridge writes a machine-readable manifest, and the generator produces a fully-typed TypeScript client that you can call directly — as if the backend functions were local.

---

## The problem

Every full-stack project ends up with the same boilerplate:

```ts
// You write this manually. Over and over.
async function createUser(name: string, email: string) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) throw new Error("...");
  return res.json();
}
```

When your API changes, you update the backend route, then hunt down every fetch wrapper and update it too. There's no single source of truth, no type safety at the boundary, and no enforcement that your frontend matches your backend.

## The solution

route-bridge uses a **contract-driven codegen** approach:

1. You define routes with metadata (path, method, body schema, query params, response shape)
2. route-bridge writes a `route-bridge.manifest.json`
3. `npx route-bridge generate` reads the manifest and generates a typed TypeScript client
4. You import `createApiClient` and call routes as typed methods — nothing to write manually

```ts
// This is generated. You just call it.
const api = createApiClient({ baseUrl: "http://localhost:3001/api" });

const greeting = await api.getGreeting({ query: { name: "Amaan" } });
const user     = await api.getUserById({ params: { id: "1" } });
const newUser  = await api.createUser({ body: { name: "Ada", email: "ada@example.com" } });
const posts    = await api.listPosts({ query: { page: 1, limit: 10 } });
```

All calls are fully typed. No `any`. No fetch boilerplate. No drift between backend and frontend.

---

## Why contract-driven codegen?

| Approach | Type safety | Stays in sync | Works across languages |
|---|---|---|---|
| Handwritten fetch wrappers | ❌ manual | ❌ manual | ✅ |
| Runtime discovery | ⚠️ runtime only | ⚠️ fragile | ❌ |
| **route-bridge contract + codegen** | ✅ compile-time | ✅ re-run generator | ✅ |

The manifest is the contract. It's human-readable JSON. You can commit it, diff it in PRs, and export it to OpenAPI in a future version.

---

## Package structure

```
route-bridge/
  packages/
    core/              # Shared manifest types, path utilities
    config/            # defineConfig(), validateConfig()
    logger/            # createLogger(), pretty terminal output
    express/           # createRouteBridge(), defineRoute() for Express
    generator/         # Reads manifest → generates TypeScript client
    client/            # Runtime helpers used by generated clients
    create-route-bridge-app/  # npx create-route-bridge-app scaffolder
  python/
    flask_route_bridge/       # Flask RouteBridge class + decorator
  examples/
    express-next/      # Express backend + Next.js frontend demo
    flask-next/        # Flask backend + Next.js frontend demo
```

---

## Quick start

### Option A — scaffold a new project

```bash
npx create-route-bridge-app
```

Answer two questions (backend framework, include frontend?), and you have a working project.

### Option B — add to an existing project

**Express:**

```bash
npm install @route-bridge/express @route-bridge/generator
```

```ts
import { createRouteBridge, routeBridgeErrorHandler } from "@route-bridge/express";

const { router, defineRoute, writeManifest } = createRouteBridge();

defineRoute({
  name: "createUser",
  method: "POST",
  path: "/users",
  body: { name: "string", email: "string" },
  response: { id: "string", name: "string" },
  handler: async ({ body }) => {
    const { name, email } = body as { name: string; email: string };
    return { id: "abc", name };
  },
});

app.use("/api", router);
app.use(routeBridgeErrorHandler());
writeManifest(); // writes route-bridge.manifest.json
```

**Flask:**

```bash
pip install flask-route-bridge
```

```python
from flask_route_bridge import RouteBridge

rb = RouteBridge(app, manifest_path="./route-bridge.manifest.json", url_prefix="/api")

@rb.route(name="createUser", method="POST", path="/users",
          body={"name": "string", "email": "string"},
          response={"id": "string", "name": "string"})
def create_user(body, query, params, request):
    return {"id": "abc", "name": body["name"]}

rb.write_manifest()
```

**Generate the client:**

```bash
npx route-bridge generate \
  --manifest ./route-bridge.manifest.json \
  --output ./src/generated
```

**Use it in your frontend:**

```ts
import { createApiClient } from "./src/generated/client";

const api = createApiClient({ baseUrl: "http://localhost:3001/api" });

const user = await api.createUser({ body: { name: "Amaan", email: "amaan@example.com" } });
console.log(user.id); // typed: string
```

---

## Express integration

### `createRouteBridge(options?)`

Creates a route-bridge instance for Express.

```ts
import { createRouteBridge } from "@route-bridge/express";

const { router, defineRoute, writeManifest, getRoutes } = createRouteBridge({
  manifestPath: "./route-bridge.manifest.json", // default
  logging: true,                                // default: true in dev
});
```

### `defineRoute(definition)`

Registers a route. Adds it to the manifest and mounts it on the Express router.

```ts
defineRoute({
  name: "getUserById",          // used as the generated function name
  method: "GET",
  path: "/users/:id",
  params: { id: "string" },
  query: { include: "string?" },
  response: { id: "string", name: "string" },
  description: "Fetch a user",
  handler: async ({ body, query, params, req, res }) => {
    return { id: params.id, name: "Ada" };
  },
});
```

**Field types** supported in body/query/params/response schemas:

| Type | Meaning |
|---|---|
| `"string"` | Required string |
| `"string?"` | Optional string |
| `"number"` | Required number |
| `"number?"` | Optional number |
| `"boolean"` | Required boolean |
| `"boolean?"` | Optional boolean |
| `"any"` | Any value (untyped) |

### `routeBridgeErrorHandler()`

Express error-handling middleware. Converts thrown errors to JSON `{ error: "..." }` responses.

```ts
app.use(routeBridgeErrorHandler());
```

---

## Flask integration

### `RouteBridge(app, *, manifest_path, logging, url_prefix)`

```python
from flask_route_bridge import RouteBridge

rb = RouteBridge(
    app,
    manifest_path="./route-bridge.manifest.json",
    logging=True,         # auto-enabled when FLASK_DEBUG=1
    url_prefix="/api",
)
```

Supports the Flask application factory pattern:

```python
rb = RouteBridge(manifest_path="./route-bridge.manifest.json")
# later:
rb.init_app(app)
```

### `@rb.route(...)`

```python
@rb.route(
    name="listPosts",
    method="GET",
    path="/posts",
    query={"page": "number?", "limit": "number?"},
    response={"posts": "any", "total": "number"},
)
def list_posts(body, query, params, request):
    return {"posts": [], "total": 0}
```

Handler arguments:

| Arg | Contents |
|---|---|
| `body` | Parsed JSON body dict |
| `query` | Query string dict (numeric types cast automatically) |
| `params` | Path parameter dict |
| `request` | Raw Flask `request` object |

### `rb.write_manifest()`

Writes the manifest to disk. Call this once at startup (before `app.run()`).

---

## Code generation

```bash
# One-shot
npx route-bridge generate

# Custom paths
npx route-bridge generate \
  --manifest ./route-bridge.manifest.json \
  --output ./src/generated

# Watch mode (re-generates when manifest changes)
npx route-bridge generate --watch
```

**Config file** — create `route-bridge.config.js` in your backend directory:

```js
module.exports = {
  manifestPath: "./route-bridge.manifest.json",
  outputDir: "../frontend/src/generated",
};
```

**Function naming rules:**

| Route name / path | Generated method |
|---|---|
| `name: "createUser"` | `api.createUser()` |
| `name: "getUserById"` | `api.getUserById()` |
| `/users/:id` (no name) | `api.usersById()` |
| `/my-endpoint` (no name) | `api.myEndpoint()` |

Explicit `name` always wins over path inference. Use explicit names for stability.

---

## Generated client

The generated `client.ts` exports `createApiClient`:

```ts
import { createApiClient } from "./generated/client";

const api = createApiClient({
  baseUrl: "http://localhost:3001/api",

  // Optional:
  authToken: "my-jwt-token",           // → Authorization: Bearer my-jwt-token
  defaultHeaders: { "X-App": "web" },  // merged into every request
  debug: true,                         // logs every request/response
  retries: 2,                          // retry on network failure
});
```

The client:
- Interpolates path params automatically (`/users/:id` → `/users/42`)
- Appends query strings, filtering `undefined`/`null` values
- Sends `Content-Type: application/json` by default
- Throws descriptive errors on non-2xx responses
- Works in Next.js, Node.js 18+, and any browser with `fetch`

---

## Logging

Logging is auto-enabled in development and silent in production.

```ts
import { createLogger } from "@route-bridge/logger";

const logger = createLogger({ enabled: true });

const ctx = logger.logRequestStart({ method: "POST", path: "/users", routeName: "createUser" });
// → [route-bridge] → POST   /users → createUser [rb-0001]

logger.logRequestEnd(ctx, 201);
// ← [route-bridge] ← POST   /users 201 12ms [rb-0001]
```

**Output example:**

```
[route-bridge] info  Registered route: POST /users → createUser
[route-bridge] →     POST   /users → createUser [rb-0001]
[route-bridge] ←     POST   /users 201 8ms [rb-0001]
[route-bridge] ✖     POST   /users ERROR User not found [rb-0002]
```

Disable in production: set `NODE_ENV=production` or pass `logging: false` to `createRouteBridge`.

---

## Config validation

```ts
import { defineConfig, validateConfig } from "@route-bridge/config";

const config = defineConfig({
  baseUrl: "https://api.example.com",
  outputDir: "./src/generated",
  backend: "express",
});

validateConfig(config); // throws ConfigValidationError with clear messages if invalid
```

**Environment variable overrides:**

| Env var | Config key | Default |
|---|---|---|
| `ROUTE_BRIDGE_BASE_URL` | `baseUrl` | `http://localhost:3001` |
| `ROUTE_BRIDGE_OUTPUT_DIR` | `outputDir` | `./src/generated` |
| `ROUTE_BRIDGE_MANIFEST_PATH` | `manifestPath` | `./route-bridge.manifest.json` |
| `ROUTE_BRIDGE_DEBUG` | `debug` | `true` in dev |
| `ROUTE_BRIDGE_LOGGING` | `logging` | `true` |
| `ROUTE_BRIDGE_BACKEND` | `backend` | `express` |

**Generic schema validation** (for your own project config):

```ts
import { validateSchema } from "@route-bridge/config";

const config = validateSchema(
  {
    DATABASE_URL: { type: "string", required: true },
    PORT:         { type: "number", default: 3001 },
    LOG_LEVEL:    { type: "enum", values: ["debug", "info", "warn"], default: "info" },
  },
  process.env
);
// config is fully typed: { DATABASE_URL: string; PORT: number; LOG_LEVEL: string }
```

---

## Scaffolder

```bash
npx create-route-bridge-app
```

Prompts:
1. Project name
2. Backend: `express` or `flask`
3. Include Next.js frontend: `yes` or `no`

Generates a ready-to-run project with:
- Backend with two sample routes
- Manifest generation script
- Frontend with pre-wired generated client usage
- Config and logging setup
- README with next steps

---

## Running the demos

### Express + Next.js demo

```bash
# Terminal 1 - backend
cd examples/express-next/backend
npm install
npm run dev
# → http://localhost:3001
# → writes route-bridge.manifest.json

# Terminal 2 - generate client
cd examples/express-next/backend
npm run generate
# → writes examples/express-next/frontend/lib/generated/client.ts

# Terminal 3 - frontend
cd examples/express-next/frontend
npm install
npm run dev
# → http://localhost:3000
```

### Flask + Next.js demo

```bash
# Terminal 1 - backend
cd examples/flask-next/backend
pip install flask flask-cors flask-route-bridge
FLASK_DEBUG=1 python app.py
# → http://localhost:3001
# → writes route-bridge.manifest.json

# Terminal 2 - generate client
npx route-bridge generate \
  --manifest examples/flask-next/backend/route-bridge.manifest.json \
  --output examples/flask-next/frontend/lib/generated

# Terminal 3 - frontend
cd examples/flask-next/frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## The manifest format

The manifest is the contract between your backend and the generator. Both Express and Flask emit this same format:

```json
{
  "version": "1",
  "generatedAt": "2024-05-01T00:00:00.000Z",
  "routes": [
    {
      "name": "createUser",
      "method": "POST",
      "path": "/users",
      "body": { "name": "string", "email": "string" },
      "response": { "id": "string", "name": "string" },
      "description": "Create a new user"
    }
  ]
}
```

The manifest is designed to be:
- Committable to git (track API changes in PRs)
- Human-readable
- Extendable to full OpenAPI export (v2 roadmap)

---

## Setup & installation

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8 (`npm install -g pnpm`)
- Python ≥ 3.9 (for Flask integration)

### Install & build all packages

```bash
git clone https://github.com/your-org/route-bridge
cd route-bridge
pnpm install
pnpm build
```

### Build a single package

```bash
pnpm --filter @route-bridge/express build
```

---

## Publishing

### npm packages

```bash
# Build everything
pnpm build

# Publish each package (requires npm login)
pnpm --filter @route-bridge/core publish --access public
pnpm --filter @route-bridge/config publish --access public
pnpm --filter @route-bridge/logger publish --access public
pnpm --filter @route-bridge/client publish --access public
pnpm --filter @route-bridge/express publish --access public
pnpm --filter @route-bridge/generator publish --access public
pnpm --filter create-route-bridge-app publish --access public
```

### verify package versions
```bash
echo "core:" && npm view @route-bridge/core version
echo "express:" && npm view @route-bridge/express version
echo "generator:" && npm view @route-bridge/generator version
echo "logger:" && npm view @route-bridge/logger version
echo "config:" && npm view @route-bridge/config version
echo "client:" && npm view @route-bridge/client version
echo "create-app:" && npm view create-route-bridge-app version
```

Or use changesets for automated versioning:

```bash
pnpm add -Dw @changesets/cli
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

### Python package

```bash
cd python
pip install build twine
python -m build
twine upload dist/*
```

### Repomix 

```bash
repomix "D:\0 AMAAN MAIN\0 Codes and Tools\My Packages\route-bridge" -o prompting/route-bridge.md --style markdown --ignore "node_modules,.next,dist,build,.git,.turbo,coverage"
```

---

## v2 Roadmap

- **OpenAPI export** — emit standard OpenAPI 3.1 JSON from the manifest
- **Zod schema generation** — generate Zod validators alongside TypeScript types
- **Watch mode for backends** — auto-regenerate manifest when route files change
- **React Query integration** — generate `useQuery`/`useMutation` hooks
- **Auth presets** — built-in JWT, API key, and OAuth header helpers
- **Response validation** — optional runtime validation of API responses against schema
- **Fastify adapter** — `@route-bridge/fastify`
- **Django adapter** — `django-route-bridge`
- **VS Code extension** — inline type hints for route definitions

---

## License

MIT © route-bridge contributors
