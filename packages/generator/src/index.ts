/**
 * @route-bridge/generator
 *
 * Reads route-bridge.manifest.json and generates a typed TypeScript frontend client.
 */

import fs from "fs";
import path from "path";
import {
  RouteBridgeManifest,
  RouteMetadata,
  FieldType,
  SchemaMap,
  pathToFunctionName,
  extractPathParams,
} from "@route-bridge/core";

// ─── Type mapping ─────────────────────────────────────────────────────────────

function fieldTypeToTS(ft: FieldType): string {
  const map: Record<FieldType, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    "string?": "string | undefined",
    "number?": "number | undefined",
    "boolean?": "boolean | undefined",
    any: "unknown",
    "any?": "unknown | undefined",
  };
  return map[ft] ?? "unknown";
}

function schemaToInterface(schema: SchemaMap | undefined, fallback: string): string {
  if (!schema || Object.keys(schema).length === 0) return fallback;
  const lines = Object.entries(schema).map(([key, type]) => {
    const optional = type.endsWith("?") ? "?" : "";
    const tsType = fieldTypeToTS(type);
    return `    ${key}${optional}: ${tsType};`;
  });
  return `{\n${lines.join("\n")}\n  }`;
}

// ─── Generate a single route's types and call signature ──────────────────────

function generateRouteTypes(route: RouteMetadata): string {
  const fnName = pathToFunctionName(route.path, route.name);
  const pathParams = extractPathParams(route.path);

  const paramsType =
    pathParams.length > 0
      ? `{ ${pathParams.map((p) => `${p}: string`).join("; ")} }`
      : "undefined";

  const bodyType =
    route.method !== "GET" && route.body
      ? schemaToInterface(route.body, "undefined")
      : "undefined";

  const queryType = route.query
    ? schemaToInterface(route.query, "undefined")
    : "undefined";

  const responseType = route.response
    ? schemaToInterface(route.response, "unknown")
    : "unknown";

  return `
/** ${route.description ?? `${route.method} ${route.path}`} */
export interface ${fnName}Options {
  ${pathParams.length > 0 ? `params: ${paramsType};` : ""}
  ${bodyType !== "undefined" ? `body?: ${bodyType};` : ""}
  ${queryType !== "undefined" ? `query?: ${queryType};` : ""}
  headers?: Record<string, string>;
}

export type ${fnName}Response = ${responseType};
`.trim();
}

// ─── Generate the api call function ──────────────────────────────────────────

function generateRouteFunction(route: RouteMetadata): string {
  const fnName = pathToFunctionName(route.path, route.name);
  const pathParams = extractPathParams(route.path);

  // Build the path interpolation
  let pathExpr = `"${route.path}"`;
  if (pathParams.length > 0) {
    // Replace :param with ${options.params.param}
    const interpolated = route.path.replace(
      /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (_: string, p: string) => `\${options.params.${p}}`
    );
    pathExpr = `\`${interpolated}\``;
  }

  const hasBody = route.method !== "GET" && route.body;
  const hasQuery = !!route.query;
  const methodHasBody = ["POST", "PUT", "PATCH"].includes(route.method);

  return `
  async ${fnName}(options: ${fnName}Options = {} as ${fnName}Options): Promise<${fnName}Response> {
    return this._call({
      method: "${route.method}",
      path: ${pathExpr},
      ${hasQuery ? "query: options.query," : ""}
      ${hasBody || methodHasBody ? "body: options.body," : ""}
      headers: options.headers,
    });
  }`.trim();
}

// ─── Generate the full client file ───────────────────────────────────────────

export function generateClient(manifest: RouteBridgeManifest): string {
  const typeBlocks = manifest.routes.map(generateRouteTypes).join("\n\n");
  const fnBlocks = manifest.routes.map(generateRouteFunction).join(",\n\n  ");

  return `/**
 * route-bridge generated client
 * Generated at: ${manifest.generatedAt}
 * DO NOT EDIT - re-run \`npx route-bridge generate\` to update
 */

// ─── Options passed to the api factory ───────────────────────────────────────

export interface ApiClientOptions {
  /** Base URL of your backend (no trailing slash) */
  baseUrl: string;

  /** Optional auth token - sent as Bearer in Authorization header */
  authToken?: string;

  /** Additional default headers merged into every request */
  defaultHeaders?: Record<string, string>;

  /** Log every request/response to the console */
  debug?: boolean;

  /** Number of times to retry on network failure (default: 0) */
  retries?: number;
}

// ─── Internal call params ─────────────────────────────────────────────────────

interface CallParams {
  method: string;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
}

// ─── Generated route types ────────────────────────────────────────────────────

${typeBlocks}

// ─── API client class ─────────────────────────────────────────────────────────

class RouteBridgeClient {
  private readonly baseUrl: string;
  private readonly options: Required<ApiClientOptions>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\\/$/, "");
    this.options = {
      baseUrl: this.baseUrl,
      authToken: options.authToken ?? "",
      defaultHeaders: options.defaultHeaders ?? {},
      debug: options.debug ?? false,
      retries: options.retries ?? 0,
    };
  }

  private async _call<T>(params: CallParams, attempt = 0): Promise<T> {
    let url = this.baseUrl + params.path;

    if (params.query) {
      const qs = Object.entries(params.query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => \`\${encodeURIComponent(k)}=\${encodeURIComponent(String(v))}\`)
        .join("&");
      if (qs) url += "?" + qs;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.options.defaultHeaders,
    };

    if (this.options.authToken) {
      headers["Authorization"] = \`Bearer \${this.options.authToken}\`;
    }

    if (params.headers) {
      Object.assign(headers, params.headers);
    }

    const init: RequestInit = {
      method: params.method,
      headers,
    };

    if (params.body !== undefined && params.method !== "GET") {
      init.body = JSON.stringify(params.body);
    }

    if (this.options.debug) {
      console.debug(\`[route-bridge] → \${params.method} \${url}\`, params.body ?? "");
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      if (attempt < this.options.retries) {
        return this._call<T>(params, attempt + 1);
      }
      throw new Error(\`[route-bridge] Network error: \${(err as Error).message}\`);
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (this.options.debug) {
      console.debug(\`[route-bridge] ← \${response.status}\`, data);
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : \`HTTP \${response.status}\`;
      throw new Error(\`[route-bridge] \${message}\`);
    }

    return data as T;
  }

  // ─── Generated route methods ────────────────────────────────────────────────

  ${fnBlocks}
}

// ─── Factory function ─────────────────────────────────────────────────────────

/**
 * Create a typed API client.
 *
 * @example
 * import { createApiClient } from "./generated/client";
 *
 * const api = createApiClient({ baseUrl: "http://localhost:3001" });
 * const result = await api.createUser({ body: { name: "Amaan" } });
 */
export function createApiClient(options: ApiClientOptions): RouteBridgeClient {
  return new RouteBridgeClient(options);
}

export type { RouteBridgeClient };
`;
}

// ─── Read manifest from disk ──────────────────────────────────────────────────

export function readManifest(manifestPath: string): RouteBridgeManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `[route-bridge] Manifest not found at ${manifestPath}. ` +
        `Run your backend once (or use writeManifest()) to generate it.`
    );
  }
  const raw = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as RouteBridgeManifest;
}

// ─── Write generated client to disk ──────────────────────────────────────────

export function writeClient(outputDir: string, clientSource: string): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filePath = path.join(outputDir, "client.ts");
  fs.writeFileSync(filePath, clientSource, "utf-8");
  return filePath;
}

// ─── Top-level generate() ─────────────────────────────────────────────────────

export interface GenerateOptions {
  manifestPath: string;
  outputDir: string;
}

export function generate(options: GenerateOptions): string {
  const manifest = readManifest(options.manifestPath);
  const source = generateClient(manifest);
  const filePath = writeClient(options.outputDir, source);
  return filePath;
}
