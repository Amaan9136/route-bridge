"""
Tests for flask_route_bridge
"""
import json
import pytest
from flask import Flask
from flask_route_bridge import RouteBridge


@pytest.fixture
def app(tmp_path):
    flask_app = Flask(__name__)
    flask_app.config["TESTING"] = True

    rb = RouteBridge(
        flask_app,
        manifest_path=str(tmp_path / "route-bridge.manifest.json"),
        logging=False,
        url_prefix="/api",
    )

    @rb.route(
        name="getGreeting",
        method="GET",
        path="/greeting",
        query={"name": "string?"},
        response={"message": "string"},
    )
    def get_greeting(body, query, params, request):
        name = query.get("name", "World")
        return {"message": f"Hello, {name}!"}

    @rb.route(
        name="createItem",
        method="POST",
        path="/items",
        body={"title": "string"},
        response={"id": "string", "title": "string"},
    )
    def create_item(body, query, params, request):
        return {"id": "abc123", "title": body.get("title", "")}

    @rb.route(
        name="getItemById",
        method="GET",
        path="/items/<id>",
        params={"id": "string"},
        response={"id": "string"},
    )
    def get_item_by_id(body, query, params, request):
        return {"id": params["id"]}

    rb.write_manifest()
    return flask_app, rb


@pytest.fixture
def client(app):
    flask_app, _ = app
    return flask_app.test_client()


def test_get_greeting_default(client):
    res = client.get("/api/greeting")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["message"] == "Hello, World!"


def test_get_greeting_with_name(client):
    res = client.get("/api/greeting?name=Amaan")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["message"] == "Hello, Amaan!"


def test_create_item(client):
    res = client.post(
        "/api/items",
        data=json.dumps({"title": "My Item"}),
        content_type="application/json",
    )
    assert res.status_code == 201
    data = json.loads(res.data)
    assert data["title"] == "My Item"
    assert "id" in data


def test_get_item_by_id(client):
    res = client.get("/api/items/xyz")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["id"] == "xyz"


def test_manifest_written(app, tmp_path):
    _, rb = app
    manifest_path = str(tmp_path / "route-bridge.manifest.json")
    with open(manifest_path) as f:
        manifest = json.load(f)

    assert manifest["version"] == "1"
    assert len(manifest["routes"]) == 3

    names = [r["name"] for r in manifest["routes"]]
    assert "getGreeting" in names
    assert "createItem" in names
    assert "getItemById" in names


def test_manifest_route_shape(app, tmp_path):
    _, rb = app
    manifest_path = str(tmp_path / "route-bridge.manifest.json")
    with open(manifest_path) as f:
        manifest = json.load(f)

    greeting = next(r for r in manifest["routes"] if r["name"] == "getGreeting")
    assert greeting["method"] == "GET"
    assert greeting["path"] == "/greeting"
    assert greeting["query"] == {"name": "string?"}

    item = next(r for r in manifest["routes"] if r["name"] == "createItem")
    assert item["method"] == "POST"
    assert item["body"] == {"title": "string"}


def test_path_params_normalised(app, tmp_path):
    """Flask <id> paths are normalised to :id in the manifest."""
    _, rb = app
    manifest_path = str(tmp_path / "route-bridge.manifest.json")
    with open(manifest_path) as f:
        manifest = json.load(f)

    by_id = next(r for r in manifest["routes"] if r["name"] == "getItemById")
    # Should be normalised from /items/<id> to /items/:id
    assert by_id["path"] == "/items/:id"
