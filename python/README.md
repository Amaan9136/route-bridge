# flask-route-bridge

Flask integration for [route-bridge](https://github.com/your-org/route-bridge).

Define your Flask routes with metadata, emit a shared manifest, and generate a typed TypeScript frontend client automatically.

## Install

```bash
pip install flask-route-bridge
```

## Quick start

```python
from flask import Flask
from flask_route_bridge import RouteBridge

app = Flask(__name__)
rb = RouteBridge(app, manifest_path="./route-bridge.manifest.json", url_prefix="/api")

@rb.route(
    name="createUser",
    method="POST",
    path="/users",
    body={"name": "string", "email": "string"},
    response={"id": "string", "name": "string"},
)
def create_user(body, query, params, request):
    return {"id": "abc", "name": body["name"]}

if __name__ == "__main__":
    rb.write_manifest()   # writes route-bridge.manifest.json
    app.run(port=3001)
```

Then generate the TypeScript client:

```bash
npx route-bridge generate \
  --manifest ./route-bridge.manifest.json \
  --output ../frontend/src/generated
```

## API

### `RouteBridge(app?, *, manifest_path, logging, url_prefix)`

| Param | Type | Default | Description |
|---|---|---|---|
| `app` | `Flask` | `None` | Flask app (or pass later via `init_app`) |
| `manifest_path` | `str` | `./route-bridge.manifest.json` | Where to write the manifest |
| `logging` | `bool` | `True` in debug mode | Enable request logging |
| `url_prefix` | `str` | `""` | URL prefix for all routes |

### `@rb.route(name, method, path, body?, query?, params?, response?, description?)`

Decorator that registers a Flask route and records its metadata.

Handler signature: `fn(body, query, params, request) -> dict`

### `rb.write_manifest()`

Writes the manifest to `manifest_path`. Call at startup.

### `rb.init_app(app)`

Attach to a Flask app after construction (application factory pattern).

## License

MIT
