/**
 * @route-bridge/client
 *
 * Public-facing re-exports for the runtime client.
 * The generated client (from `npx route-bridge generate`) extends these.
 */

export interface ApiClientOptions {
  /** Base URL of your backend (no trailing slash) */
  baseUrl: string;

  /** Optional bearer token - sent as Authorization: Bearer <token> */
  authToken?: string;

  /** Additional headers merged into every request */
  defaultHeaders?: Record<string, string>;

  /** Log every request and response to the console */
  debug?: boolean;

  /** Number of times to retry on network failure (default: 0) */
  retries?: number;
}

/**
 * Build a query string from an object.
 * Filters out undefined/null values automatically.
 */
export function buildQueryString(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

/**
 * Interpolate path params into a route path.
 * e.g. interpolatePath("/users/:id", { id: "42" }) → "/users/42"
 */
export function interpolatePath(
  pathTemplate: string,
  params: Record<string, string>
): string {
  return pathTemplate.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key: string) => {
    if (!(key in params)) {
      throw new Error(`[route-bridge] Missing path param: ${key}`);
    }
    return encodeURIComponent(params[key]);
  });
}

/**
 * Generic fetch wrapper with sensible defaults.
 * The generated client uses this internally.
 */
export async function callApi<T>(
  baseUrl: string,
  options: ApiClientOptions,
  params: {
    method: string;
    path: string;
    query?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, string>;
  },
  attempt = 0
): Promise<T> {
  let url = baseUrl.replace(/\/$/, "") + params.path;

  if (params.query) {
    const qs = buildQueryString(params.query);
    if (qs) url += "?" + qs;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.defaultHeaders ?? {}),
  };

  if (options.authToken) {
    headers["Authorization"] = `Bearer ${options.authToken}`;
  }

  if (params.headers) {
    Object.assign(headers, params.headers);
  }

  const init: RequestInit = { method: params.method, headers };

  if (params.body !== undefined && params.method !== "GET") {
    init.body = JSON.stringify(params.body);
  }

  if (options.debug) {
    console.debug(`[route-bridge] → ${params.method} ${url}`, params.body ?? "");
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    if (attempt < (options.retries ?? 0)) {
      return callApi<T>(baseUrl, options, params, attempt + 1);
    }
    throw new Error(`[route-bridge] Network error: ${(err as Error).message}`);
  }

  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (options.debug) {
    console.debug(`[route-bridge] ← ${response.status}`, data);
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : `HTTP ${response.status}`;
    throw new Error(`[route-bridge] ${message}`);
  }

  return data as T;
}
