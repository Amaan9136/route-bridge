/**
 * @route-bridge/core tests
 */

import assert from "assert";
import {
  pathToFunctionName,
  normalisePath,
  extractPathParams,
  createManifest,
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

console.log("\n@route-bridge/core\n");

test("pathToFunctionName uses explicit name", () => {
  assert.strictEqual(pathToFunctionName("/users", "createUser"), "createUser");
});

test("pathToFunctionName converts /greeting to getGreeting (via explicit name)", () => {
  assert.strictEqual(pathToFunctionName("/greeting", "getGreeting"), "getGreeting");
});

test("pathToFunctionName converts /users to users (no explicit name)", () => {
  assert.strictEqual(pathToFunctionName("/users"), "users");
});

test("pathToFunctionName converts /users/:id to usersById", () => {
  assert.strictEqual(pathToFunctionName("/users/:id"), "usersById");
});

test("pathToFunctionName converts /my-backend-route to myBackendRoute", () => {
  assert.strictEqual(pathToFunctionName("/my-backend-route"), "myBackendRoute");
});

test("pathToFunctionName strips Flask <param> angle brackets", () => {
  assert.strictEqual(pathToFunctionName("/users/<id>"), "usersById");
});

test("normalisePath converts Flask <id> to :id", () => {
  assert.strictEqual(normalisePath("/users/<id>"), "/users/:id");
});

test("normalisePath leaves Express :param unchanged", () => {
  assert.strictEqual(normalisePath("/users/:id"), "/users/:id");
});

test("extractPathParams returns param names", () => {
  assert.deepStrictEqual(extractPathParams("/users/:id/posts/:postId"), ["id", "postId"]);
});

test("extractPathParams returns empty array for no params", () => {
  assert.deepStrictEqual(extractPathParams("/users"), []);
});

test("createManifest sets version to '1'", () => {
  const m = createManifest([]);
  assert.strictEqual(m.version, "1");
});

test("createManifest includes generatedAt", () => {
  const m = createManifest([]);
  assert.ok(m.generatedAt);
  assert.ok(new Date(m.generatedAt).getTime() > 0);
});

test("createManifest includes routes", () => {
  const route = {
    name: "getUsers",
    method: "GET" as const,
    path: "/users",
  };
  const m = createManifest([route]);
  assert.strictEqual(m.routes.length, 1);
  assert.strictEqual(m.routes[0].name, "getUsers");
});

console.log("");
