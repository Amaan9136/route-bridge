/**
 * @route-bridge/config
 *
 * Minimal config definition and validation helper.
 * Used both internally by route-bridge packages and optionally by user projects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldSchema =
  | { type: "string"; required?: boolean; default?: string }
  | { type: "number"; required?: boolean; default?: number }
  | { type: "boolean"; required?: boolean; default?: boolean }
  | { type: "enum"; values: string[]; required?: boolean; default?: string };

export type ConfigSchema = Record<string, FieldSchema>;

export type InferConfig<S extends ConfigSchema> = {
  [K in keyof S]: S[K] extends { type: "string" }
    ? string
    : S[K] extends { type: "number" }
    ? number
    : S[K] extends { type: "boolean" }
    ? boolean
    : S[K] extends { type: "enum" }
    ? string
    : never;
};

export interface RouteBridgeConfig {
  /** Base URL the frontend client will call. Defaults to http://localhost:3001 */
  baseUrl: string;

  /** Directory where the generator writes the client. Defaults to ./src/generated */
  outputDir: string;

  /** Path to manifest file. Defaults to ./route-bridge.manifest.json */
  manifestPath: string;

  /** Enable debug logging. Defaults to NODE_ENV !== 'production' */
  debug: boolean;

  /** Enable request logging middleware. Defaults to true */
  logging: boolean;

  /** Backend framework in use. Used by the scaffolder. */
  backend: "express" | "flask";
}

// ─── defineConfig ─────────────────────────────────────────────────────────────

/**
 * Define and merge route-bridge configuration with sensible defaults.
 *
 * @example
 * const config = defineConfig({ baseUrl: "https://api.example.com" });
 */
export function defineConfig(partial: Partial<RouteBridgeConfig> = {}): RouteBridgeConfig {
  const defaults: RouteBridgeConfig = {
    baseUrl: process.env.ROUTE_BRIDGE_BASE_URL ?? "http://localhost:3001",
    outputDir: process.env.ROUTE_BRIDGE_OUTPUT_DIR ?? "./src/generated",
    manifestPath: process.env.ROUTE_BRIDGE_MANIFEST_PATH ?? "./route-bridge.manifest.json",
    debug: process.env.ROUTE_BRIDGE_DEBUG === "true" || process.env.NODE_ENV !== "production",
    logging: process.env.ROUTE_BRIDGE_LOGGING !== "false",
    backend: (process.env.ROUTE_BRIDGE_BACKEND as "express" | "flask") ?? "express",
  };

  return { ...defaults, ...partial };
}

// ─── validateConfig ───────────────────────────────────────────────────────────

export class ConfigValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`route-bridge config validation failed:\n${errors.map((e) => `  • ${e}`).join("\n")}`);
    this.name = "ConfigValidationError";
  }
}

/**
 * Validate a RouteBridgeConfig object and throw a descriptive error if invalid.
 *
 * @example
 * validateConfig(config);
 */
export function validateConfig(config: RouteBridgeConfig): void {
  const errors: string[] = [];

  if (!config.baseUrl) {
    errors.push("baseUrl is required");
  } else if (!/^https?:\/\/.+/.test(config.baseUrl)) {
    errors.push(`baseUrl must be a valid HTTP/HTTPS URL, got: "${config.baseUrl}"`);
  }

  if (!config.outputDir) {
    errors.push("outputDir is required");
  }

  if (!config.manifestPath) {
    errors.push("manifestPath is required");
  }

  if (!["express", "flask"].includes(config.backend)) {
    errors.push(`backend must be "express" or "flask", got: "${config.backend}"`);
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
}

// ─── Generic schema validator (for user projects) ─────────────────────────────

/**
 * Validate an arbitrary object against a simple schema.
 * Returns a typed config or throws ConfigValidationError.
 *
 * @example
 * const config = validateSchema(
 *   { DATABASE_URL: { type: "string", required: true } },
 *   process.env
 * );
 */
export function validateSchema<S extends ConfigSchema>(
  schema: S,
  source: Record<string, unknown> = {}
): InferConfig<S> {
  const errors: string[] = [];
  const result: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(schema)) {
    const raw = source[key];

    if (raw === undefined || raw === null || raw === "") {
      if (field.required !== false && field.default === undefined) {
        errors.push(`${key} is required`);
        continue;
      }
      result[key] = field.default;
      continue;
    }

    switch (field.type) {
      case "string":
        result[key] = String(raw);
        break;
      case "number": {
        const n = Number(raw);
        if (isNaN(n)) {
          errors.push(`${key} must be a number, got: "${raw}"`);
        } else {
          result[key] = n;
        }
        break;
      }
      case "boolean":
        result[key] = raw === true || raw === "true" || raw === "1";
        break;
      case "enum":
        if (!field.values.includes(String(raw))) {
          errors.push(`${key} must be one of [${field.values.join(", ")}], got: "${raw}"`);
        } else {
          result[key] = String(raw);
        }
        break;
    }
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  return result as InferConfig<S>;
}
