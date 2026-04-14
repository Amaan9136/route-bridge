/**
 * @route-bridge/core
 *
 * Shared manifest types that both Express and Flask integrations output,
 * and the generator reads. This is the single source of truth for the
 * route-bridge contract format.
 */

// ─── Primitive field types used in body/query/response schemas ───────────────

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "string?"
  | "number?"
  | "boolean?"
  | "any"
  | "any?";

export type SchemaMap = Record<string, FieldType>;

// ─── A single route's full metadata ──────────────────────────────────────────

export interface RouteMetadata {
  /** Unique stable name used to generate the frontend function name */
  name: string;

  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  /** Express/Flask-style path, e.g. /users/:id or /users/<id> */
  path: string;

  /** Named path parameters, e.g. { id: "string" } */
  params?: SchemaMap;

  /** Query string parameters */
  query?: SchemaMap;

  /** Request body schema (ignored for GET) */
  body?: SchemaMap;

  /** Response body schema */
  response?: SchemaMap;

  /** Extra headers this route expects */
  headers?: Record<string, string>;

  /** Human-readable description */
  description?: string;

  /** Tags for grouping (future use) */
  tags?: string[];
}

// ─── The manifest file written to disk ───────────────────────────────────────

export interface RouteBridgeManifest {
  /** Manifest schema version */
  version: "1";

  /** ISO timestamp of last generation */
  generatedAt: string;

  /** The routes */
  routes: RouteMetadata[];
}

// ─── Utility: create an empty manifest ───────────────────────────────────────

export function createManifest(routes: RouteMetadata[] = []): RouteBridgeManifest {
  return {
    version: "1",
    generatedAt: new Date().toISOString(),
    routes,
  };
}

// ─── Utility: convert a path or name to a camelCase function name ─────────────

export function pathToFunctionName(path: string, explicitName?: string): string {
  if (explicitName) return explicitName;

  return path
    .replace(/^\//, "")                    // strip leading slash
    .replace(/[<>]/g, "")                  // strip Flask <param> brackets
    .replace(/:([a-zA-Z]+)/g, "By$1")      // :id → ById
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase()) // kebab-case to camel
    .replace(/^(.)/, (c: string) => c.toLowerCase()); // ensure lowercase first char
}

// ─── Utility: normalise Flask-style paths to Express-style ───────────────────

export function normalisePath(path: string): string {
  // /users/<id> → /users/:id
  return path.replace(/<([^>]+)>/g, ":$1");
}

// ─── Utility: extract param names from a path ────────────────────────────────

export function extractPathParams(path: string): string[] {
  const matches = path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return [...matches].map((m) => m[1]);
}
