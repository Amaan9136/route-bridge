#!/usr/bin/env node
/**
 * route-bridge CLI
 * Usage:
 *   npx route-bridge generate
 *   npx route-bridge generate --manifest ./custom.manifest.json --output ./src/api
 *   npx route-bridge generate --watch
 */

import path from "path";
import fs from "fs";
import { generate } from "./index";
import { createLogger } from "@route-bridge/logger";

const log = createLogger({ enabled: true });

// ─── Parse argv ───────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args["command"] = arg;
    }
  }
  return args;
}

// ─── Load route-bridge.config.ts / route-bridge.config.js if present ─────────

function loadConfigFile(cwd: string): { manifestPath?: string; outputDir?: string } {
  const candidates = [
    path.join(cwd, "route-bridge.config.js"),
    path.join(cwd, "route-bridge.config.cjs"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(c) as { default?: unknown } | unknown;
        const cfg = (mod as { default?: unknown }).default ?? mod;
        return cfg as { manifestPath?: string; outputDir?: string };
      } catch {
        // ignore
      }
    }
  }
  return {};
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const command = (args["command"] as string) ?? "generate";
  const cwd = process.cwd();

  if (command !== "generate") {
    console.error(`Unknown command: ${command}`);
    console.error("Usage: route-bridge generate [--manifest <path>] [--output <dir>] [--watch]");
    process.exit(1);
  }

  const fileCfg = loadConfigFile(cwd);

  const manifestPath = path.resolve(
    cwd,
    (args["manifest"] as string) ??
      fileCfg.manifestPath ??
      process.env.ROUTE_BRIDGE_MANIFEST_PATH ??
      "route-bridge.manifest.json"
  );

  const outputDir = path.resolve(
    cwd,
    (args["output"] as string) ??
      fileCfg.outputDir ??
      process.env.ROUTE_BRIDGE_OUTPUT_DIR ??
      "src/generated"
  );

  const watch = args["watch"] === true;

  function run() {
    try {
      const filePath = generate({ manifestPath, outputDir });
      log.info(`Client generated → ${filePath}`);
    } catch (err) {
      log.error(`Generation failed: ${(err as Error).message}`);
      if (!watch) process.exit(1);
    }
  }

  run();

  if (watch) {
    log.info(`Watching ${manifestPath} for changes…`);
    fs.watch(manifestPath, { persistent: true }, (event) => {
      if (event === "change") {
        log.info("Manifest changed, regenerating…");
        run();
      }
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
