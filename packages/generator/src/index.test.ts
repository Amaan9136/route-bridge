/**
 * @route-bridge/generator tests
 *
 * Tests for the core generation logic: manifest reading,
 * type generation, client code output.
 */

import assert from "assert";
import { generateClient } from "../src/index";
import { RouteBridgeManifest } from "@route-bridge/core";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleManifest: RouteBridgeManifest = {
  version: "1",
  generatedAt: "2024-01-01T00:00:00.000Z",
  routes: [
    {
      name: "getGreeting",
      method: "GET",
      path: "/greeting",
      query: { name: "string?" },
      response: { message: "string" },
    },
    {
      name: "getUserById",
      method: "GET",
      path: "/users/:id",
      params: { id: "string" },
      response: { id: "string", name: "string" },
    },
    {
      name: "createUser",
      method: "POST",
      path: "/users",
      body: { name: "string", email: "string" },
      response: { id: "string", name: "string" },
    },
    {
      name: "deletePost",
      method: "DELETE",
      path: "/posts/:id",
      params: { id: "string" },
      response: { success: "boolean" },
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

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

function contains(source: string, substring: string, label?: string) {
  assert.ok(
    source.includes(substring),
    `Expected output to contain: ${label ?? substring}`
  );
}

console.log("\n@route-bridge/generator\n");

const output = generateClient(sampleManifest);

test("generates createApiClient factory", () => {
  contains(output, "export function createApiClient");
});

test("generates getGreeting method", () => {
  contains(output, "async getGreeting(");
});

test("generates getUserById method", () => {
  contains(output, "async getUserById(");
});

test("generates createUser method", () => {
  contains(output, "async createUser(");
});

test("generates deletePost method", () => {
  contains(output, "async deletePost(");
});

test("interpolates path params for getUserById", () => {
  contains(output, "options.params.id", "path param interpolation");
});

test("generates query type for getGreeting", () => {
  contains(output, "getGreetingOptions");
  contains(output, "name?: string | undefined");
});

test("generates body type for createUser", () => {
  contains(output, "createUserOptions");
  contains(output, "name: string");
  contains(output, "email: string");
});

test("generates response types", () => {
  contains(output, "getGreetingResponse");
  contains(output, "createUserResponse");
});

test("includes DO NOT EDIT header", () => {
  contains(output, "DO NOT EDIT");
});

test("includes generatedAt timestamp", () => {
  contains(output, "2024-01-01T00:00:00.000Z");
});

test("sends correct method for DELETE", () => {
  // deletePost should use DELETE
  contains(output, 'method: "DELETE"');
});

test("GET routes do not send body", () => {
  // getGreeting and getUserById should not have body: in their _call
  const getGreetingBlock = output.slice(
    output.indexOf("async getGreeting("),
    output.indexOf("async getUserById(")
  );
  assert.ok(!getGreetingBlock.includes("body: options.body"), "GET route should not send body");
});

console.log("");
