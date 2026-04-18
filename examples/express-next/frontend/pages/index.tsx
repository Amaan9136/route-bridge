"use client";
/**
 * Express + Next.js demo page
 *
 * Demonstrates calling the route-bridge generated client from a Next.js frontend.
 * The `api` object is auto-generated from the backend's route definitions.
 */
import { useState } from "react";
import { createApiClient } from "../lib/generated/client";
// Create a single client instance for the whole app
// In a real project: put this in lib/api.ts and export it
const api = createApiClient({
  baseUrl: "http://localhost:5000/api",
  debug: true,
});
type Post = { id: string; title: string; author: string };
export default function DemoPage() {
  const [greeting, setGreeting] = useState("");
  const [greetingName, setGreetingName] = useState("Amaan");
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [userId, setUserId] = useState("1");
  const [newUserName, setNewUserName] = useState("Ada Lovelace");
  const [newUserEmail, setNewUserEmail] = useState("ada@example.com");
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsLimit, setPostsLimit] = useState(5);
  const [deletePostId, setDeletePostId] = useState("1");
  const [deleteResult, setDeleteResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    setLoading(label);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(null);
    }
  }
  return (
    <main style={{ fontFamily: "monospace", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ color: "#0070f3" }}>🌉 route-bridge demo</h1>
      <p style={{ color: "#666" }}>
        All API calls below use the <strong>auto-generated</strong>{" "}
        <code>api.*</code> client — no handwritten fetch wrappers.
      </p>
      {error && (
        <div style={{ background: "#fee", padding: "0.75rem", borderRadius: 6, marginBottom: "1rem" }}>
          ❌ {error}
        </div>
      )}
      <section style={{ marginBottom: "2rem" }}>
        <h2>GET /greeting</h2>
        <pre style={{ background: "#f4f4f4", padding: "0.75rem", borderRadius: 6 }}>
          {`await api.getGreeting({ query: { name: "${greetingName}" } })`}
        </pre>
        <label style={labelStyle}>
          name:&nbsp;
          <input value={greetingName} onChange={e => setGreetingName(e.target.value)} style={inputStyle} />
        </label>
        <button
          onClick={async () => {
            const data = await run("greeting", () =>
              api.getGreeting({ query: { name: greetingName } })
            );
            if (data) setGreeting(data.message);
          }}
          disabled={loading !== null}
          style={btnStyle}
        >
          {loading === "greeting" ? "Loading…" : "Run"}
        </button>
        {greeting && <Result value={greeting} />}
      </section>
      <section style={{ marginBottom: "2rem" }}>
        <h2>GET /users/:id</h2>
        <pre style={{ background: "#f4f4f4", padding: "0.75rem", borderRadius: 6 }}>
          {`await api.getUserById({ params: { id: "${userId}" } })`}
        </pre>
        <label style={labelStyle}>
          id:&nbsp;
          <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} />
        </label>
        <button
          onClick={async () => {
            const data = await run("user", () => api.getUserById({ params: { id: userId } }));
            if (data) setUser(data);
          }}
          disabled={loading !== null}
          style={btnStyle}
        >
          {loading === "user" ? "Loading…" : "Run"}
        </button>
        {user && <Result value={JSON.stringify(user, null, 2)} />}
      </section>
      <section style={{ marginBottom: "2rem" }}>
        <h2>POST /users</h2>
        <pre style={{ background: "#f4f4f4", padding: "0.75rem", borderRadius: 6 }}>
          {`await api.createUser({ body: { name: "${newUserName}", email: "${newUserEmail}" } })`}
        </pre>
        <label style={labelStyle}>
          name:&nbsp;
          <input value={newUserName} onChange={e => setNewUserName(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          email:&nbsp;
          <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} style={inputStyle} />
        </label>
        <button
          onClick={async () => {
            const data = await run("create", () =>
              api.createUser({ body: { name: newUserName, email: newUserEmail } })
            );
            if (data) setUser(data);
          }}
          disabled={loading !== null}
          style={btnStyle}
        >
          {loading === "create" ? "Loading…" : "Run"}
        </button>
        {user && <Result value={JSON.stringify(user, null, 2)} />}
      </section>
      <section style={{ marginBottom: "2rem" }}>
        <h2>GET /posts</h2>
        <pre style={{ background: "#f4f4f4", padding: "0.75rem", borderRadius: 6 }}>
          {`await api.listPosts({ query: { page: ${postsPage}, limit: ${postsLimit} } })`}
        </pre>
        <label style={labelStyle}>
          page:&nbsp;
          <input type="number" value={postsPage} onChange={e => setPostsPage(Number(e.target.value))} style={{ ...inputStyle, width: 60 }} />
        </label>
        <label style={labelStyle}>
          limit:&nbsp;
          <input type="number" value={postsLimit} onChange={e => setPostsLimit(Number(e.target.value))} style={{ ...inputStyle, width: 60 }} />
        </label>
        <button
          onClick={async () => {
            const data = await run("posts", () =>
              api.listPosts({ query: { page: postsPage, limit: postsLimit } })
            );
            if (data) setPosts(data.posts as Post[]);
          }}
          disabled={loading !== null}
          style={btnStyle}
        >
          {loading === "posts" ? "Loading…" : "Run"}
        </button>
        {posts.length > 0 && <Result value={JSON.stringify(posts, null, 2)} />}
      </section>
      <section style={{ marginBottom: "2rem" }}>
        <h2>DELETE /posts/:id</h2>
        <pre style={{ background: "#f4f4f4", padding: "0.75rem", borderRadius: 6 }}>
          {`await api.deletePost({ params: { id: "${deletePostId}" } })`}
        </pre>
        <label style={labelStyle}>
          id:&nbsp;
          <input value={deletePostId} onChange={e => setDeletePostId(e.target.value)} style={inputStyle} />
        </label>
        <button
          onClick={async () => {
            const data = await run("delete", () => api.deletePost({ params: { id: deletePostId } }));
            if (data) setDeleteResult(data.success);
          }}
          disabled={loading !== null}
          style={{ ...btnStyle, background: "#dc2626" }}
        >
          {loading === "delete" ? "Loading…" : "Run"}
        </button>
        {deleteResult !== null && <Result value={JSON.stringify({ success: deleteResult }, null, 2)} />}
      </section>
    </main>
  );
}
function Result({ value }: { value: string }) {
  return (
    <pre
      style={{
        background: "#e8f5e9",
        padding: "0.75rem",
        borderRadius: 6,
        marginTop: "0.5rem",
        whiteSpace: "pre-wrap",
      }}
    >
      {value}
    </pre>
  );
}
const btnStyle: React.CSSProperties = {
  background: "#0070f3",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "0.5rem 1.25rem",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: "0.95rem",
  marginTop: "0.5rem",
};
const labelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  marginRight: "1rem",
  marginTop: "0.5rem",
};
const inputStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "0.9rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  padding: "0.25rem 0.5rem",
  width: 180,
};