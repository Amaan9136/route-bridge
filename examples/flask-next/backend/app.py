"""
route-bridge Flask demo backend

Demonstrates:
- Registering typed routes with RouteBridge
- Automatic manifest generation
- Same manifest format as Express, feeding the same TS generator

Run:
    pip install flask flask-cors flask-route-bridge
    FLASK_DEBUG=1 python app.py

Then in another terminal:
    npx route-bridge generate \\
      --manifest ./route-bridge.manifest.json \\
      --output ../frontend/lib/generated
"""

import os
import uuid
import datetime
from flask import Flask
from flask_cors import CORS
from flask_route_bridge import RouteBridge

# ─── App setup ────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# ─── route-bridge setup ───────────────────────────────────────────────────────

rb = RouteBridge(
    app,
    manifest_path="./route-bridge.manifest.json",
    logging=os.environ.get("FLASK_DEBUG", "0") == "1",
    url_prefix="/api",
)

# ─── In-memory store (demo) ───────────────────────────────────────────────────

_USERS = {
    "1": {"name": "Amaan Qureshi", "email": "amaan@example.com"},
    "2": {"name": "Ada Lovelace", "email": "ada@example.com"},
}

# ─── Routes ───────────────────────────────────────────────────────────────────


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
    return {"message": f"Hello, {name}! Greetings from route-bridge + Flask."}


@rb.route(
    name="getUserById",
    method="GET",
    path="/users/<id>",
    params={"id": "string"},
    response={"id": "string", "name": "string", "email": "string"},
    description="Fetch a user by ID",
)
def get_user_by_id(body, query, params, request):
    user_id = params.get("id")
    user = _USERS.get(user_id)
    if not user:
        from flask import abort
        abort(404, description="User not found")
    return {"id": user_id, **user}


@rb.route(
    name="createUser",
    method="POST",
    path="/users",
    body={"name": "string", "email": "string"},
    response={"id": "string", "name": "string", "email": "string", "createdAt": "string"},
    description="Create a new user",
)
def create_user(body, query, params, request):
    new_id = str(uuid.uuid4())[:8]
    user = {"name": body.get("name", ""), "email": body.get("email", "")}
    _USERS[new_id] = user
    return {
        "id": new_id,
        **user,
        "createdAt": datetime.datetime.utcnow().isoformat(),
    }


@rb.route(
    name="listPosts",
    method="GET",
    path="/posts",
    query={"page": "number?", "limit": "number?"},
    response={"posts": "any", "total": "number", "page": "number"},
    description="List paginated posts",
)
def list_posts(body, query, params, request):
    page = int(query.get("page", 1))
    limit = int(query.get("limit", 10))
    all_posts = [
        {"id": "1", "title": "Hello route-bridge", "author": "Amaan"},
        {"id": "2", "title": "Type-safe APIs with generated clients", "author": "Ada"},
    ]
    return {"posts": all_posts[:limit], "total": len(all_posts), "page": page}


@rb.route(
    name="deletePost",
    method="DELETE",
    path="/posts/<id>",
    params={"id": "string"},
    response={"success": "boolean"},
    description="Delete a post by ID",
)
def delete_post(body, query, params, request):
    print(f"Deleting post {params.get('id')}")
    return {"success": True}


# ─── Start ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    rb.write_manifest()
    print("\n  🌉 route-bridge + Flask running on http://localhost:3001\n")
    print("  Run `npx route-bridge generate` to produce the frontend client.\n")
    app.run(port=3001, debug=True)
