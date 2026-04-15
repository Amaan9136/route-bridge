/**
 * @route-bridge/express
 *
 * Express integration for route-bridge.
 * Registers typed routes and writes the manifest for code generation.
 */

import fs from "fs";
import crypto from "crypto";
import path from "path";
import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import {
  RouteMetadata,
  RouteBridgeManifest,
  createManifest,
  normalisePath,
} from "@route-bridge/core";
import { createLogger, Logger } from "@route-bridge/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { RouteMetadata };

export interface RouteHandlerContext<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
> {
  body: TBody;
  query: TQuery;
  params: TParams;
  req: Request;
  res: Response;
}

export interface RouteDefinition<TBody = unknown, TQuery = unknown, TParams = unknown>
  extends Omit<RouteMetadata, "path"> {
  path: string;
  handler: (ctx: RouteHandlerContext<TBody, TQuery, TParams>) => Promise<unknown> | unknown;
}

export interface RouteBridgeExpressOptions {
  /** Where to write the manifest. Defaults to ./route-bridge.manifest.json */
  manifestPath?: string;

  /** Enable request logging. Defaults to true in development */
  logging?: boolean;

  /** Existing logger instance to reuse */
  logger?: Logger;
}

// ─── RouteBridge Express ──────────────────────────────────────────────────────

export interface RouteBridgeExpress {
  /** The Express Router with all registered routes */
  router: Router;

  /** Register a route */
  defineRoute<TBody = unknown, TQuery = unknown, TParams = unknown>(
    definition: RouteDefinition<TBody, TQuery, TParams>
  ): void;

  /** Write the manifest file */
  writeManifest(): void;

  /** Get all registered route metadata */
  getRoutes(): RouteMetadata[];
}

/**
 * Create a route-bridge Express instance.
 *
 * @example
 * const { router, defineRoute, writeManifest } = createRouteBridge();
 *
 * defineRoute({
 *   name: "createUser",
 *   method: "POST",
 *   path: "/users",
 *   body: { name: "string", email: "string" },
 *   response: { id: "string", name: "string" },
 *   handler: async ({ body }) => {
 *     return { id: "123", name: body.name };
 *   }
 * });
 *
 * app.use("/api", router);
 * writeManifest();
 */
export function createRouteBridge(options: RouteBridgeExpressOptions = {}): RouteBridgeExpress {
  const manifestPath = options.manifestPath ?? "./route-bridge.manifest.json";
  const log = options.logger ?? createLogger({ enabled: options.logging });
  const router = Router();
  const routes: RouteMetadata[] = [];

  function defineRoute<TBody, TQuery, TParams>(
    def: RouteDefinition<TBody, TQuery, TParams>
  ): void {
    const normPath = normalisePath(def.path);

    // Record metadata
    const meta: RouteMetadata = {
      name: def.name,
      method: def.method,
      path: normPath,
      params: def.params,
      query: def.query,
      body: def.body,
      response: def.response,
      headers: def.headers,
      description: def.description,
      tags: def.tags,
    };
    routes.push(meta);

    // Register Express route
    const expressMethod = def.method.toLowerCase() as
      | "get" | "post" | "put" | "patch" | "delete";

    const expressHandler: RequestHandler = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const ctx = log.logRequestStart({
        method: def.method,
        path: req.path,
        routeName: def.name,
        requestId: crypto.randomUUID(),
      });

      try {
        const result = await def.handler({
          body: req.body as TBody,
          query: req.query as TQuery,
          params: req.params as TParams,
          req,
          res,
        });

        // If handler already sent a response (e.g. res.redirect), skip
        if (res.headersSent) return;

        const statusCode = def.method === "POST" ? 201 : 200;
        log.logRequestEnd(ctx, statusCode);
        res.status(statusCode).json(result);
      } catch (err) {
        log.logError(ctx, err);
        next(err);
      }
    };

    router[expressMethod](normPath, expressHandler);
    log.info(`Registered route: ${def.method} ${normPath} → ${def.name}`);
  }

  function writeManifest(): void {
    const manifest: RouteBridgeManifest = createManifest(routes);
    const dir = path.dirname(manifestPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    log.info(`Manifest written → ${manifestPath} (${routes.length} routes)`);
  }

  function getRoutes(): RouteMetadata[] {
    return [...routes];
  }

  return { router, defineRoute, writeManifest, getRoutes };
}

// ─── Error handler middleware ─────────────────────────────────────────────────

export function routeBridgeErrorHandler() {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ error: message });
  };
}
