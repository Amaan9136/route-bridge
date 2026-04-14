/**
 * @route-bridge/logger
 *
 * Beautiful, minimal request/response logger for route-bridge backends.
 * Auto-enabled in development, silent in production unless opted in.
 */

// ─── ANSI colour helpers ──────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  // colours
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
} as const;

function paint(color: keyof typeof c, text: string): string {
  return `${c[color]}${text}${c.reset}`;
}

// ─── Logger options ───────────────────────────────────────────────────────────

export interface LoggerOptions {
  /** Set false to silence all output (e.g. in tests) */
  enabled?: boolean;

  /** Prefix shown in every log line */
  prefix?: string;

  /** Show timestamps */
  timestamps?: boolean;
}

// ─── Request context ──────────────────────────────────────────────────────────

export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  routeName?: string;
  startTime: number;
}

// ─── Logger instance ──────────────────────────────────────────────────────────

export interface Logger {
  logRequestStart(ctx: Omit<RequestContext, "startTime">): RequestContext;
  logRequestEnd(ctx: RequestContext, statusCode: number): void;
  logError(ctx: RequestContext, error: unknown): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// ─── Method colour map ────────────────────────────────────────────────────────

function methodColor(method: string): string {
  const map: Record<string, string> = {
    GET: paint("green", "GET   "),
    POST: paint("blue", "POST  "),
    PUT: paint("yellow", "PUT   "),
    PATCH: paint("magenta", "PATCH "),
    DELETE: paint("red", "DELETE"),
  };
  return map[method.toUpperCase()] ?? paint("white", method.padEnd(6));
}

function statusColor(status: number): string {
  if (status < 300) return paint("green", String(status));
  if (status < 400) return paint("cyan", String(status));
  if (status < 500) return paint("yellow", String(status));
  return paint("red", String(status));
}

function durationLabel(ms: number): string {
  if (ms < 10) return paint("green", `${ms}ms`);
  if (ms < 100) return paint("yellow", `${ms}ms`);
  return paint("red", `${ms}ms`);
}

let _reqCounter = 0;

function nextRequestId(): string {
  return `rb-${(++_reqCounter).toString().padStart(4, "0")}`;
}

// ─── createLogger ─────────────────────────────────────────────────────────────

/**
 * Create a logger instance.
 *
 * @example
 * const logger = createLogger();
 * const ctx = logger.logRequestStart({ method: "POST", path: "/users", routeName: "createUser" });
 * logger.logRequestEnd(ctx, 201);
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const isDev = process.env.NODE_ENV !== "production";
  const enabled = options.enabled ?? isDev;
  const prefix = options.prefix ?? paint("cyan", "[route-bridge]");
  const timestamps = options.timestamps ?? false;

  function ts(): string {
    if (!timestamps) return "";
    return paint("gray", `[${new Date().toISOString()}] `);
  }

  function log(level: string, message: string): void {
    if (!enabled) return;
    process.stdout.write(`${ts()}${prefix} ${level} ${message}\n`);
  }

  return {
    logRequestStart(ctx): RequestContext {
      const requestId = nextRequestId();
      const full: RequestContext = { ...ctx, requestId, startTime: Date.now() };

      const parts = [
        methodColor(ctx.method),
        paint("white", ctx.path),
      ];
      if (ctx.routeName) {
        parts.push(paint("gray", `→ ${ctx.routeName}`));
      }
      parts.push(paint("gray", `[${requestId}]`));

      log(paint("gray", "→"), parts.join(" "));
      return full;
    },

    logRequestEnd(ctx, statusCode) {
      const ms = Date.now() - ctx.startTime;
      const parts = [
        methodColor(ctx.method),
        paint("white", ctx.path),
        statusColor(statusCode),
        durationLabel(ms),
        paint("gray", `[${ctx.requestId}]`),
      ];
      log(paint("gray", "←"), parts.join(" "));
    },

    logError(ctx, error) {
      const msg = error instanceof Error ? error.message : String(error);
      const parts = [
        methodColor(ctx.method),
        paint("white", ctx.path),
        paint("red", "ERROR"),
        paint("gray", msg),
        paint("gray", `[${ctx.requestId}]`),
      ];
      log(paint("red", "✖"), parts.join(" "));
    },

    debug(message, ...args) {
      log(paint("gray", "debug"), `${paint("gray", message)} ${args.map(String).join(" ")}`);
    },

    info(message, ...args) {
      log(paint("cyan", "info "), `${message} ${args.map(String).join(" ")}`);
    },

    warn(message, ...args) {
      log(paint("yellow", "warn "), `${paint("yellow", message)} ${args.map(String).join(" ")}`);
    },

    error(message, ...args) {
      log(paint("red", "error"), `${paint("red", message)} ${args.map(String).join(" ")}`);
    },
  };
}

// ─── formatError ─────────────────────────────────────────────────────────────

export function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

// ─── Default global logger ────────────────────────────────────────────────────

export const logger = createLogger();
