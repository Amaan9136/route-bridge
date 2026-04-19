/**
 * route-bridge generated client
 * Generated at: 2024-05-01T00:00:00.000Z
 * DO NOT EDIT - re-run `npx route-bridge generate` to update
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

/** Return a personalised greeting */
export interface getGreetingOptions {
  query?: {
    name?: string | undefined;
  };
  headers?: Record<string, string>;
}

export type getGreetingResponse = {
  message: string;
};

/** Fetch a user by ID */
export interface getUserByIdOptions {
  params: { id: string };
  headers?: Record<string, string>;
}

export type getUserByIdResponse = {
  id: string;
  name: string;
  email: string;
};

/** Create a new user */
export interface createUserOptions {
  body?: {
    name: string;
    email: string;
  };
  headers?: Record<string, string>;
}

export type createUserResponse = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

/** List paginated posts */
export interface listPostsOptions {
  query?: {
    page?: number | undefined;
    limit?: number | undefined;
  };
  headers?: Record<string, string>;
}

export type listPostsResponse = {
  posts: unknown;
  total: number;
  page: number;
};

/** Delete a post by ID */
export interface deletePostOptions {
  params: { id: string };
  headers?: Record<string, string>;
}

export type deletePostResponse = {
  success: boolean;
};

// ─── API client class ─────────────────────────────────────────────────────────

class RouteBridgeClient {
  private readonly baseUrl: string;
  private readonly options: Required<ApiClientOptions>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
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
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (qs) url += "?" + qs;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.options.defaultHeaders,
    };

    if (this.options.authToken) {
      headers["Authorization"] = `Bearer ${this.options.authToken}`;
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
      console.debug(`[route-bridge] → ${params.method} ${url}`, params.body ?? "");
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      if (attempt < this.options.retries) {
        return this._call<T>(params, attempt + 1);
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

    if (this.options.debug) {
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

  // ─── Generated route methods ────────────────────────────────────────────────

  async getGreeting(options: getGreetingOptions = {}): Promise<getGreetingResponse> {
    return this._call({
      method: "GET",
      path: "/greeting",
      query: options.query,
      headers: options.headers,
    });
  }

  async getUserById(options: getUserByIdOptions): Promise<getUserByIdResponse> {
    return this._call({
      method: "GET",
      path: `/users/${options.params.id}`,
      headers: options.headers,
    });
  }

  async createUser(options: createUserOptions = {}): Promise<createUserResponse> {
    return this._call({
      method: "POST",
      path: "/users",
      body: options.body,
      headers: options.headers,
    });
  }

  async listPosts(options: listPostsOptions = {}): Promise<listPostsResponse> {
    return this._call({
      method: "GET",
      path: "/posts",
      query: options.query,
      headers: options.headers,
    });
  }

  async deletePost(options: deletePostOptions): Promise<deletePostResponse> {
    return this._call({
      method: "DELETE",
      path: `/posts/${options.params.id}`,
      headers: options.headers,
    });
  }
}

// ─── Factory function ─────────────────────────────────────────────────────────

/**
 * Create a typed API client.
 *
 * @example
 * import { createApiClient } from "./generated/client";
 *
 * const api = createApiClient({ baseUrl: "http://localhost:3001/api" });
 *
 * // Fully typed - no manual fetch wrappers needed!
 * const greeting = await api.getGreeting({ query: { name: "Amaan" } });
 * const user = await api.getUserById({ params: { id: "1" } });
 * const newUser = await api.createUser({ body: { name: "Ada", email: "ada@example.com" } });
 * const posts = await api.listPosts({ query: { page: 1, limit: 5 } });
 * await api.deletePost({ params: { id: "1" } });
 */
export function createApiClient(options: ApiClientOptions): RouteBridgeClient {
  return new RouteBridgeClient(options);
}

export type { RouteBridgeClient };
