#!/usr/bin/env node
/**
 * create-route-bridge-app
 * Usage: npx create-route-bridge-app
 */

import fs from "fs";
import path from "path";
import readline from "readline";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
};
const p = (col: keyof typeof c, t: string) => `${c[col]}${t}${c.reset}`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string, choices?: string[], defaultVal?: string): Promise<string> {
  return new Promise((resolve) => {
    const hint = choices
      ? ` (${choices.map((ch) => (ch === defaultVal ? p("cyan", ch) : ch)).join(" / ")})`
      : defaultVal
      ? ` [${defaultVal}]`
      : "";
    rl.question(`${question}${hint}: `, (answer) => {
      const trimmed = answer.trim();
      if (!trimmed && defaultVal) return resolve(defaultVal);
      if (choices && !choices.includes(trimmed)) {
        console.log(p("yellow", `  Please enter one of: ${choices.join(", ")}`));
        resolve(ask(question, choices, defaultVal));
      } else {
        resolve(trimmed);
      }
    });
  });
}

function write(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  ${p("green", "+")} ${filePath}`);
}

// ─── Express template ─────────────────────────────────────────────────────────

function scaffoldExpress(dir: string, withFrontend: boolean, withTailwind: boolean) {
  write(
    path.join(dir, "backend", "package.json"),
    JSON.stringify(
      {
        name: `${path.basename(dir)}-backend`,
        version: "0.1.0",
        scripts: {
          dev: "ts-node src/index.ts",
          build: "tsc",
          generate: "route-bridge generate --manifest ./route-bridge.manifest.json --output ../frontend/src/generated",
        },
        dependencies: {
          "@route-bridge/express": "^0.1.0",
          "@route-bridge/config": "^0.1.0",
          "@route-bridge/logger": "^0.1.0",
          "@route-bridge/generator": "^0.1.0",
          cors: "^2.8.5",
          express: "^4.18.3",
        },
        devDependencies: {
          "@types/cors": "^2.8.17",
          "@types/express": "^4.17.21",
          "@types/node": "^20.12.7",
          "ts-node": "^10.9.2",
          typescript: "^5.4.5",
        },
      },
      null,
      2
    )
  );

  write(
    path.join(dir, "backend", "src", "index.ts"),
    `import express from "express";
import cors from "cors";
import { createRouteBridge, routeBridgeErrorHandler } from "@route-bridge/express";
import { defineConfig, validateConfig } from "@route-bridge/config";

const config = defineConfig({ backend: "express" });
validateConfig(config);

const app = express();
app.use(cors());
app.use(express.json());

/** createRouteBridge */
const { router, defineRoute, writeManifest } = createRouteBridge({
  manifestPath: "./route-bridge.manifest.json",
  logging: config.debug,
});

defineRoute({
  name: "getGreeting",
  method: "GET",
  path: "/greeting",
  query: { name: "string?" },
  response: { message: "string" },
  description: "Return a personalised greeting",
  handler: async ({ query }) => {
    const name = (query as { name?: string }).name ?? "World";
    return { message: \`Hello, \${name}! Greetings from route-bridge.\` };
  },
});

defineRoute({
  name: "createItem",
  method: "POST",
  path: "/items",
  body: { title: "string", description: "string?" },
  response: { id: "string", title: "string", createdAt: "string" },
  description: "Create a new item",
  handler: async ({ body }) => {
    const { title } = body as { title: string };
    return { id: Math.random().toString(36).slice(2), title, createdAt: new Date().toISOString() };
  },
});

app.use("/api", router);
app.use(routeBridgeErrorHandler());

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(\`\\n  🌉 route-bridge backend running on http://localhost:\${PORT}\\n\`);
  writeManifest();
});
`
  );

  write(
    path.join(dir, "backend", "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "CommonJS",
          outDir: "dist",
          rootDir: "src",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          resolveJsonModule: true,
        },
        include: ["src"],
      },
      null,
      2
    )
  );

  write(
    path.join(dir, "backend", "route-bridge.config.js"),
    `module.exports = {
  manifestPath: "./route-bridge.manifest.json",
  outputDir: "../frontend/src/generated",
};
`
  );

  if (withFrontend) scaffoldNextFrontend(dir, withTailwind);
}

// ─── Flask template ───────────────────────────────────────────────────────────

function scaffoldFlask(dir: string, withFrontend: boolean, withTailwind: boolean) {
  write(
    path.join(dir, "backend", "requirements.txt"),
    `flask>=2.3.0
flask-cors>=4.0.0
flask-route-bridge>=0.1.0
`
  );

  write(
    path.join(dir, "backend", "app.py"),
    `"""
${path.basename(dir)} - Flask backend powered by route-bridge
"""
import os
from flask import Flask
from flask_cors import CORS
from flask_route_bridge import RouteBridge

app = Flask(__name__)
CORS(app)

rb = RouteBridge(
    app,
    manifest_path="./route-bridge.manifest.json",
    logging=os.environ.get("FLASK_DEBUG", "0") == "1",
    url_prefix="/api",
)


@rb.route(
    name="getGreeting",
    method="GET",
    path="/greeting",
    query={"name": "string?"},
    response={"message": "string"},
    description="Return a personalised greeting",
)
def get_greeting(body, query, params, request):
    name = query.get("name", "World")
    return {"message": f"Hello, {name}! Greetings from route-bridge (Flask)."}


@rb.route(
    name="createItem",
    method="POST",
    path="/items",
    body={"title": "string", "description": "string?"},
    response={"id": "string", "title": "string", "createdAt": "string"},
    description="Create a new item",
)
def create_item(body, query, params, request):
    import random, string, datetime
    item_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return {
        "id": item_id,
        "title": body.get("title", "Untitled"),
        "createdAt": datetime.datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    rb.write_manifest()
    app.run(port=3001, debug=True)
`
  );

  write(
    path.join(dir, "backend", "Makefile"),
    `install:
\tpip install -r requirements.txt

dev:
\tFLASK_DEBUG=1 python app.py

generate:
\tnpx route-bridge generate --manifest ./route-bridge.manifest.json --output ../frontend/src/generated
`
  );

  if (withFrontend) scaffoldNextFrontend(dir, withTailwind);
}

// ─── Next.js frontend template ────────────────────────────────────────────────

function scaffoldNextFrontend(dir: string, withTailwind: boolean) {
  const deps: Record<string, string> = {
    next: "^15.3.1",
    react: "^19.1.0",
    "react-dom": "^19.1.0",
  };
  const devDeps: Record<string, string> = {
    "@types/node": "^20.12.7",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    typescript: "^5.4.5",
  };

  if (withTailwind) {
    devDeps["tailwindcss"] = "^4.1.4";
    devDeps["@tailwindcss/postcss"] = "^4.1.4";
  }

  write(
    path.join(dir, "frontend", "package.json"),
    JSON.stringify(
      {
        name: `${path.basename(dir)}-frontend`,
        version: "0.1.0",
        private: true,
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: deps,
        devDependencies: devDeps,
      },
      null,
      2
    )
  );

  write(
    path.join(dir, "frontend", "next.config.ts"),
    `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`
  );

  write(
    path.join(dir, "frontend", "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          lib: ["dom", "dom.iterable", "ES2020"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          noEmit: true,
          esModuleInterop: true,
          module: "ESNext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2
    )
  );

  if (withTailwind) {
    write(
      path.join(dir, "frontend", "postcss.config.mjs"),
      `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`
    );

    write(
      path.join(dir, "frontend", "src", "app", "globals.css"),
      `@import "tailwindcss";
`
    );

    write(
      path.join(dir, "frontend", "src", "app", "layout.tsx"),
      `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "route-bridge app",
  description: "Scaffolded with create-route-bridge-app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
    );

    write(
      path.join(dir, "frontend", "src", "app", "page.tsx"),
      `"use client";
import { useState } from "react";
/** createApiClient */
// import { createApiClient } from "@/generated/client";
// const api = createApiClient({ baseUrl: "http://localhost:3001" });

export default function Home() {
  const [greeting, setGreeting] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function fetchGreeting() {
    setLoading(true);
    try {
      // Replace with: const data = await api.getGreeting({ query: { name: "Dev" } });
      const res = await fetch("http://localhost:3001/api/greeting?name=Dev");
      const data = await res.json() as { message: string };
      setGreeting(data.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 font-mono">
      <h1 className="text-2xl font-bold mb-2">🌉 route-bridge demo</h1>
      <p className="text-gray-600 mb-6">
        Start your backend, then run <code className="bg-gray-100 px-1 rounded">npm run generate</code> in the backend directory.
      </p>
      <button
        onClick={fetchGreeting}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Loading…" : "Fetch greeting"}
      </button>
      {greeting && (
        <p className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded">
          {greeting}
        </p>
      )}
    </main>
  );
}
`
    );
  } else {
    write(
      path.join(dir, "frontend", "src", "app", "layout.tsx"),
      `import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "route-bridge app",
  description: "Scaffolded with create-route-bridge-app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
    );

    write(
      path.join(dir, "frontend", "src", "app", "page.tsx"),
      `"use client";
import { useState } from "react";
/** createApiClient */
// import { createApiClient } from "@/generated/client";
// const api = createApiClient({ baseUrl: "http://localhost:3001" });

export default function Home() {
  const [greeting, setGreeting] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function fetchGreeting() {
    setLoading(true);
    try {
      // Replace with: const data = await api.getGreeting({ query: { name: "Dev" } });
      const res = await fetch("http://localhost:3001/api/greeting?name=Dev");
      const data = await res.json() as { message: string };
      setGreeting(data.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>🌉 route-bridge demo</h1>
      <p>Start your backend, then run <code>npm run generate</code> in the backend directory.</p>
      <button onClick={fetchGreeting} disabled={loading}>
        {loading ? "Loading…" : "Fetch greeting"}
      </button>
      {greeting && <p style={{ marginTop: "1rem", color: "green" }}>{greeting}</p>}
    </main>
  );
}
`
    );
  }

  write(
    path.join(dir, "frontend", "src", "generated", ".gitkeep"),
    `# This directory is populated by \`npx route-bridge generate\`
`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n  ${p("bold", p("cyan", "🌉 create-route-bridge-app"))}\n`);

  const projectName = await ask("Project name", undefined, "my-api");
  const backend = await ask("Backend framework", ["express", "flask"], "express");
  const frontend = await ask("Include Next.js frontend?", ["yes", "no"], "yes");
  const tailwind = frontend === "yes"
    ? await ask("Add Tailwind CSS to frontend?", ["yes", "no"], "yes")
    : "no";

  const dir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(dir)) {
    console.error(p("yellow", `\n  Directory "${projectName}" already exists.\n`));
    process.exit(1);
  }

  console.log(`\n  Creating project in ${p("cyan", dir)}\n`);

  const withTailwind = tailwind === "yes";

  if (backend === "express") {
    scaffoldExpress(dir, frontend === "yes", withTailwind);
  } else {
    scaffoldFlask(dir, frontend === "yes", withTailwind);
  }

  write(
    path.join(dir, ".gitignore"),
    `node_modules/
dist/
.next/
*.js.map
route-bridge.manifest.json
__pycache__/
*.pyc
.env
`
  );

  write(
    path.join(dir, "README.md"),
    `# ${projectName}

Scaffolded with [route-bridge](https://github.com/Amaan9136/route-bridge).

## Quick start

### Backend (${backend})

${
  backend === "express"
    ? `\`\`\`bash
cd backend
npm install
npm run dev        # starts the server and writes route-bridge.manifest.json
npm run generate   # generates frontend/src/generated/client.ts
\`\`\``
    : `\`\`\`bash
cd backend
pip install -r requirements.txt
make dev           # starts the server and writes route-bridge.manifest.json
make generate      # generates frontend/src/generated/client.ts
\`\`\``
}

${
  frontend === "yes"
    ? `### Frontend (Next.js${withTailwind ? " + Tailwind CSS" : ""})

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\``
    : ""
}

## How it works

1. Define routes in \`backend/\` using route-bridge helpers
2. Run \`generate\` to produce \`frontend/src/generated/client.ts\`
3. Import \`createApiClient\` in your frontend and call routes as typed functions
`
  );

  rl.close();

  console.log(
    `\n  ${p("green", "✔")} Project created!\n\n` +
      `  ${p("gray", "Next steps:")}\n\n` +
      `    cd ${projectName}/backend\n` +
      (backend === "express"
        ? `    npm install && npm run dev\n\n`
        : `    pip install -r requirements.txt && make dev\n\n`) +
      `  Then in another terminal:\n\n` +
      `    npx route-bridge generate\n\n` +
      `  ${p("cyan", "Happy bridging! 🌉")}\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});