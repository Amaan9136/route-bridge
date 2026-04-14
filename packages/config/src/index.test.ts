/**
 * @route-bridge/config tests
 */

import assert from "assert";
import {
  defineConfig,
  validateConfig,
  validateSchema,
  ConfigValidationError,
} from "../src/index";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

console.log("\n@route-bridge/config\n");

test("defineConfig returns defaults", () => {
  const cfg = defineConfig();
  assert.ok(cfg.baseUrl.startsWith("http"));
  assert.ok(cfg.outputDir);
  assert.ok(cfg.manifestPath);
  assert.ok(["express", "flask"].includes(cfg.backend));
});

test("defineConfig merges user values over defaults", () => {
  const cfg = defineConfig({ baseUrl: "https://api.example.com", backend: "flask" });
  assert.strictEqual(cfg.baseUrl, "https://api.example.com");
  assert.strictEqual(cfg.backend, "flask");
});

test("validateConfig passes valid config", () => {
  const cfg = defineConfig({ baseUrl: "http://localhost:3001" });
  assert.doesNotThrow(() => validateConfig(cfg));
});

test("validateConfig throws on missing baseUrl", () => {
  assert.throws(
    () => validateConfig({ baseUrl: "", outputDir: "./out", manifestPath: "./m.json", debug: false, logging: true, backend: "express" }),
    ConfigValidationError
  );
});

test("validateConfig throws on invalid baseUrl", () => {
  assert.throws(
    () => validateConfig({ baseUrl: "not-a-url", outputDir: "./out", manifestPath: "./m.json", debug: false, logging: true, backend: "express" }),
    ConfigValidationError
  );
});

test("validateConfig throws on invalid backend", () => {
  assert.throws(
    () => validateConfig({ baseUrl: "http://localhost", outputDir: "./out", manifestPath: "./m.json", debug: false, logging: true, backend: "fastify" as never }),
    ConfigValidationError
  );
});

test("validateSchema coerces string to number", () => {
  const result = validateSchema(
    { PORT: { type: "number", required: true } },
    { PORT: "4000" }
  );
  assert.strictEqual(result.PORT, 4000);
});

test("validateSchema uses default when field missing", () => {
  const result = validateSchema(
    { PORT: { type: "number", default: 3001 } },
    {}
  );
  assert.strictEqual(result.PORT, 3001);
});

test("validateSchema throws on missing required field", () => {
  assert.throws(
    () => validateSchema({ DB: { type: "string", required: true } }, {}),
    ConfigValidationError
  );
});

test("validateSchema validates enum values", () => {
  const result = validateSchema(
    { LOG: { type: "enum", values: ["debug", "info"], default: "info" } },
    { LOG: "debug" }
  );
  assert.strictEqual(result.LOG, "debug");
});

test("validateSchema throws on invalid enum value", () => {
  assert.throws(
    () => validateSchema({ LOG: { type: "enum", values: ["debug", "info"] } }, { LOG: "verbose" }),
    ConfigValidationError
  );
});

console.log("");
