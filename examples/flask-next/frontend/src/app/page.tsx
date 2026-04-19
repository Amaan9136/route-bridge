"use client";
import { useState } from "react";
import { createApiClient } from "@/generated/client";

/** createApiClient */
const api = createApiClient({ baseUrl: "http://localhost:8000/api", debug: true });

export default function FlaskDemoPage() {
  const [greeting, setGreeting] = useState("");
  const [greetingName, setGreetingName] = useState("Amaan");
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [userId, setUserId] = useState("1");
  const [newUserName, setNewUserName] = useState("Ada Lovelace");
  const [newUserEmail, setNewUserEmail] = useState("ada@example.com");
  const [posts, setPosts] = useState<unknown[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsLimit, setPostsLimit] = useState(5);
  const [deletePostId, setDeletePostId] = useState("1");
  const [deleteResult, setDeleteResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    setLoading(label);
    setError(null);
    try { return await fn(); }
    catch (err) { setError((err as Error).message); return null; }
    finally { setLoading(null); }
  }

  return (
    <main className="font-mono max-w-2xl mx-auto my-8 px-4">
      <h1 className="text-2xl font-bold text-green-800 mb-1">
        🌉 route-bridge demo <span className="text-base font-normal">(Flask backend)</span>
      </h1>
      <p className="text-gray-500 mb-6">
        Same generated <code className="bg-gray-100 px-1 rounded">api.*</code> client. Different backend. Same DX.
      </p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      <Section title="GET /greeting">
        <Code>{`await api.getGreeting({ query: { name: "${greetingName}" } })`}</Code>
        <Field label="name"><Input value={greetingName} onChange={e => setGreetingName(e.target.value)} /></Field>
        <Btn
          onClick={async () => { const d = await run("greeting", () => api.getGreeting({ query: { name: greetingName } })); if (d) setGreeting(d.message); }}
          disabled={loading !== null} loading={loading === "greeting"}
        />
        {greeting && <Result value={greeting} />}
      </Section>

      <Section title="GET /users/:id">
        <Code>{`await api.getUserById({ params: { id: "${userId}" } })`}</Code>
        <Field label="id"><Input value={userId} onChange={e => setUserId(e.target.value)} /></Field>
        <Btn
          onClick={async () => { const d = await run("user", () => api.getUserById({ params: { id: userId } })); if (d) setUser(d); }}
          disabled={loading !== null} loading={loading === "user"}
        />
        {user && <Result value={JSON.stringify(user, null, 2)} />}
      </Section>

      <Section title="POST /users">
        <Code>{`await api.createUser({ body: { name: "${newUserName}", email: "${newUserEmail}" } })`}</Code>
        <Field label="name"><Input value={newUserName} onChange={e => setNewUserName(e.target.value)} /></Field>
        <Field label="email"><Input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} /></Field>
        <Btn
          onClick={async () => { const d = await run("create", () => api.createUser({ body: { name: newUserName, email: newUserEmail } })); if (d) setUser(d); }}
          disabled={loading !== null} loading={loading === "create"}
        />
        {user && <Result value={JSON.stringify(user, null, 2)} />}
      </Section>

      <Section title="GET /posts">
        <Code>{`await api.listPosts({ query: { page: ${postsPage}, limit: ${postsLimit} } })`}</Code>
        <Field label="page"><Input type="number" value={postsPage} onChange={e => setPostsPage(Number(e.target.value))} className="w-16" /></Field>
        <Field label="limit"><Input type="number" value={postsLimit} onChange={e => setPostsLimit(Number(e.target.value))} className="w-16" /></Field>
        <Btn
          onClick={async () => { const d = await run("posts", () => api.listPosts({ query: { page: postsPage, limit: postsLimit } })); if (d) setPosts(d.posts as unknown[]); }}
          disabled={loading !== null} loading={loading === "posts"}
        />
        {posts.length > 0 && <Result value={JSON.stringify(posts, null, 2)} />}
      </Section>

      <Section title="DELETE /posts/:id">
        <Code>{`await api.deletePost({ params: { id: "${deletePostId}" } })`}</Code>
        <Field label="id"><Input value={deletePostId} onChange={e => setDeletePostId(e.target.value)} /></Field>
        <Btn
          onClick={async () => { const d = await run("delete", () => api.deletePost({ params: { id: deletePostId } })); if (d) setDeleteResult(d.success); }}
          disabled={loading !== null} loading={loading === "delete"} danger
        />
        {deleteResult !== null && <Result value={JSON.stringify({ success: deleteResult }, null, 2)} />}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-8"><h2 className="text-lg font-semibold mb-2">{title}</h2>{children}</section>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <pre className="bg-gray-100 px-3 py-3 rounded text-sm mb-2 overflow-x-auto">{children}</pre>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="inline-flex items-center mr-4 mt-2 text-sm">{label}:&nbsp;{children}</label>;
}
function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`font-mono text-sm border border-gray-300 rounded px-2 py-1 w-44 ${className}`} />;
}
function Btn({ onClick, disabled, loading, danger }: { onClick: () => void; disabled: boolean; loading: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mt-2 px-5 py-2 text-white rounded font-mono text-sm transition-opacity disabled:opacity-50 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-green-800 hover:bg-green-900"}`}
    >
      {loading ? "Loading…" : "Run"}
    </button>
  );
}
function Result({ value }: { value: string }) {
  return <pre className="bg-green-50 border border-green-200 px-3 py-3 rounded mt-2 text-sm whitespace-pre-wrap">{value}</pre>;
}