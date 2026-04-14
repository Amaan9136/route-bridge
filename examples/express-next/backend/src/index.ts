/**
 * route-bridge Express demo backend
 *
 * Demonstrates how route-bridge integrates with Express:
 * 1. Routes are defined with full metadata
 * 2. The manifest is written automatically
 * 3. Run `npm run generate` to produce the typed frontend client
 */

import express from "express";
import cors from "cors";
import { createRouteBridge, routeBridgeErrorHandler } from "@route-bridge/express";
import { defineConfig, validateConfig } from "@route-bridge/config";

// ─── Config ───────────────────────────────────────────────────────────────────

const config = defineConfig({
  baseUrl: "http://localhost:3001",
  backend: "express",
  debug: true,
});

validateConfig(config);

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ─── route-bridge setup ───────────────────────────────────────────────────────

const { router, defineRoute, writeManifest } = createRouteBridge({
  manifestPath: "./route-bridge.manifest.json",
  logging: config.logging,
});

// ─── Route definitions ────────────────────────────────────────────────────────

/**
 * GET /greeting?name=Amaan
 * Returns a personalised greeting.
 */
defineRoute({
  name: "getGreeting",
  method: "GET",
  path: "/greeting",
  query: { name: "string?" },
  response: { message: "string" },
  description: "Return a personalised greeting",
  handler: async ({ query }) => {
    const { name = "World" } = query as { name?: string };
    return { message: `Hello, ${name}! Greetings from route-bridge + Express.` };
  },
});

/**
 * GET /users/:id
 * Fetch a user by ID.
 */
defineRoute({
  name: "getUserById",
  method: "GET",
  path: "/users/:id",
  params: { id: "string" },
  response: { id: "string", name: "string", email: "string" },
  description: "Fetch a user by ID",
  handler: async ({ params }) => {
    const { id } = params as { id: string };
    // Simulated database lookup
    const users: Record<string, { name: string; email: string }> = {
      "1": { name: "Amaan Qureshi", email: "amaan@example.com" },
      "2": { name: "Ada Lovelace", email: "ada@example.com" },
    };
    const user = users[id];
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    return { id, ...user };
  },
});

/**
 * POST /users
 * Create a new user.
 */
defineRoute({
  name: "createUser",
  method: "POST",
  path: "/users",
  body: { name: "string", email: "string" },
  response: { id: "string", name: "string", email: "string", createdAt: "string" },
  description: "Create a new user",
  handler: async ({ body }) => {
    const { name, email } = body as { name: string; email: string };
    return {
      id: Math.random().toString(36).slice(2, 10),
      name,
      email,
      createdAt: new Date().toISOString(),
    };
  },
});

/**
 * GET /posts?page=1&limit=10
 * List paginated posts.
 */
defineRoute({
  name: "listPosts",
  method: "GET",
  path: "/posts",
  query: { page: "number?", limit: "number?" },
  response: { posts: "any", total: "number", page: "number" },
  description: "List paginated posts",
  handler: async ({ query }) => {
    const { page = 1, limit = 10 } = query as { page?: number; limit?: number };
    return {
      posts: [
        { id: "1", title: "Hello route-bridge", author: "Amaan" },
        { id: "2", title: "Type-safe APIs with generated clients", author: "Ada" },
      ].slice(0, limit),
      total: 2,
      page,
    };
  },
});

/**
 * DELETE /posts/:id
 * Delete a post.
 */
defineRoute({
  name: "deletePost",
  method: "DELETE",
  path: "/posts/:id",
  params: { id: "string" },
  response: { success: "boolean" },
  description: "Delete a post by ID",
  handler: async ({ params }) => {
    console.log(`Deleting post ${(params as { id: string }).id}`);
    return { success: true };
  },
});

// ─── Mount & start ────────────────────────────────────────────────────────────

app.use("/api", router);
app.use(routeBridgeErrorHandler());

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`\n  🌉 route-bridge + Express running on http://localhost:${PORT}\n`);
  writeManifest();
  console.log(`\n  Run \`npm run generate\` to produce the frontend client.\n`);
});
