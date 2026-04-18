"""
flask_route_bridge.bridge
=========================

Core RouteBridge class and route decorator for Flask.
Registers routes, captures metadata, and writes the shared manifest.
"""

from __future__ import annotations

import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Dict, List, Optional

try:
    from flask import Flask, request as flask_request, jsonify, Response
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "flask_route_bridge requires Flask. Install it with: pip install flask"
    ) from exc


# ─── Types / constants ────────────────────────────────────────────────────────

SchemaMap = Dict[str, str]  # e.g. {"name": "string", "age": "number?"}


def _normalise_path(path: str) -> str:
    """Convert Flask <param> style to Express :param style in the manifest."""
    return re.sub(r"<([^>]+)>", r":\1", path)


def _extract_path_params(path: str) -> List[str]:
    return re.findall(r":([a-zA-Z_][a-zA-Z0-9_]*)", _normalise_path(path))


# ─── Logger ───────────────────────────────────────────────────────────────────

ANSI = {
    "reset": "\x1b[0m",
    "green": "\x1b[32m",
    "blue": "\x1b[34m",
    "yellow": "\x1b[33m",
    "red": "\x1b[31m",
    "cyan": "\x1b[36m",
    "gray": "\x1b[90m",
    "magenta": "\x1b[35m",
}


def _paint(color: str, text: str) -> str:
    return f"{ANSI.get(color, '')}{text}{ANSI['reset']}"


def _method_label(method: str) -> str:
    colors = {
        "GET": "green",
        "POST": "blue",
        "PUT": "yellow",
        "PATCH": "magenta",
        "DELETE": "red",
    }
    return _paint(colors.get(method, "gray"), method.ljust(6))


def _status_color(status: int) -> str:
    if status < 300:
        return _paint("green", str(status))
    if status < 400:
        return _paint("cyan", str(status))
    if status < 500:
        return _paint("yellow", str(status))
    return _paint("red", str(status))


class _Logger:
    def __init__(self, enabled: bool = True, prefix: str = "[route-bridge]"):
        self.enabled = enabled
        self.prefix = _paint("cyan", prefix)

    def _write(self, arrow: str, parts: List[str]) -> None:
        if not self.enabled:
            return
        print(f"{self.prefix} {arrow} {' '.join(parts)}", flush=True)

    def request_start(self, method: str, path: str, route_name: Optional[str], req_id: str) -> float:
        parts = [_method_label(method), _paint("gray", path)]
        if route_name:
            parts.append(_paint("gray", f"→ {route_name}"))
        parts.append(_paint("gray", f"[{req_id}]"))
        self._write(_paint("gray", "→"), parts)
        return time.time()

    def request_end(self, method: str, path: str, status: int, start: float, req_id: str) -> None:
        ms = int((time.time() - start) * 1000)
        ms_color = "green" if ms < 100 else ("yellow" if ms < 500 else "red")
        parts = [
            _method_label(method),
            _paint("gray", path),
            _status_color(status),
            _paint(ms_color, f"{ms}ms"),
            _paint("gray", f"[{req_id}]"),
        ]
        self._write(_paint("gray", "←"), parts)

    def info(self, msg: str) -> None:
        self._write(_paint("cyan", "info "), [msg])

    def error(self, msg: str) -> None:
        self._write(_paint("red", "✖"), [_paint("red", msg)])


# ─── RouteBridge ─────────────────────────────────────────────────────────────


class RouteBridge:
    """
    Flask integration for route-bridge.

    Registers routes on a Flask app, records metadata, and writes the shared
    manifest so the TypeScript generator can produce a frontend client.
    """

    def __init__(
        self,
        app: Optional[Flask] = None,
        *,
        manifest_path: str = "./route-bridge.manifest.json",
        logging: Optional[bool] = None,
        url_prefix: str = "",
    ):
        self.manifest_path = manifest_path
        self.url_prefix = url_prefix
        self._routes: List[Dict[str, Any]] = []

        is_dev = os.environ.get("FLASK_ENV", "production") != "production" or \
                 os.environ.get("FLASK_DEBUG", "0") == "1"
        log_enabled = logging if logging is not None else is_dev
        self._log = _Logger(enabled=log_enabled)

        self._app: Optional[Flask] = None
        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        """Attach to a Flask app (supports application factory pattern)."""
        self._app = app

    # ─── @rb.route decorator ──────────────────────────────────────────────────

    def route(
        self,
        *,
        name: str,
        method: str = "GET",
        path: str,
        params: Optional[SchemaMap] = None,
        query: Optional[SchemaMap] = None,
        body: Optional[SchemaMap] = None,
        response: Optional[SchemaMap] = None,
        headers: Optional[Dict[str, str]] = None,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Callable:
        """
        Decorator to register a route with route-bridge.

        Usage::

            @rb.route(name="createUser", method="POST", path="/users",
                      body={"name": "string"}, response={"id": "string"})
            def create_user(body, query, params, request):
                return {"id": "1"}
        """
        normalised = _normalise_path(path)

        # Record metadata
        meta: Dict[str, Any] = {
            "name": name,
            "method": method.upper(),
            "path": normalised,
        }
        if params:
            meta["params"] = params
        if query:
            meta["query"] = query
        if body and method.upper() not in ("GET",):
            meta["body"] = body
        if response:
            meta["response"] = response
        if headers:
            meta["headers"] = headers
        if description:
            meta["description"] = description
        if tags:
            meta["tags"] = tags

        self._routes.append(meta)
        self._log.info(f"Registered route: {method.upper()} {normalised} → {name}")

        def decorator(fn: Callable) -> Callable:
            if self._app is None:
                raise RuntimeError(
                    "RouteBridge has no Flask app. Pass `app` to the constructor or call `init_app(app)`."
                )

            @wraps(fn)
            def view_func(**path_kwargs: Any) -> Any:
                req_id = str(uuid.uuid4())[:8]
                start = self._log.request_start(
                    method.upper(), flask_request.path, name, req_id
                )

                # Parse inputs
                request_body: Dict[str, Any] = {}
                if flask_request.is_json and flask_request.data:
                    request_body = flask_request.get_json(silent=True) or {}
                elif flask_request.form:
                    request_body = dict(flask_request.form)

                request_query: Dict[str, Any] = dict(flask_request.args)

                # Cast query params to declared types
                if query:
                    for k, t in query.items():
                        if k in request_query and t in ("number", "number?"):
                            try:
                                request_query[k] = float(request_query[k])  # type: ignore
                            except ValueError:
                                pass

                try:
                    result = fn(
                        body=request_body,
                        query=request_query,
                        params=path_kwargs,
                        request=flask_request,
                    )
                    status = 201 if method.upper() == "POST" else 200
                    self._log.request_end(
                        method.upper(), flask_request.path, status, start, req_id
                    )
                    return jsonify(result), status
                except Exception as exc:
                    self._log.error(f"{flask_request.path} - {exc}")
                    return jsonify({"error": str(exc)}), 500

            # Register with Flask - convert :param to <param> for Flask router
            flask_path = re.sub(r":([a-zA-Z_][a-zA-Z0-9_]*)", r"<\1>", path)
            full_path = self.url_prefix + flask_path
            endpoint_name = f"rb_{name}"
            self._app.add_url_rule(
                full_path,
                endpoint=endpoint_name,
                view_func=view_func,
                methods=[method.upper()],
            )

            return view_func

        return decorator

    # ─── Manifest ─────────────────────────────────────────────────────────────

    def write_manifest(self) -> str:
        """Write the route manifest to disk."""
        manifest = {
            "version": "1",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "routes": self._routes,
        }
        os.makedirs(os.path.dirname(os.path.abspath(self.manifest_path)), exist_ok=True)
        with open(self.manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        self._log.info(
            f"Manifest written → {self.manifest_path} ({len(self._routes)} routes)"
        )
        return self.manifest_path

    def get_routes(self) -> List[Dict[str, Any]]:
        return list(self._routes)


# ─── Standalone decorator (module-level convenience) ─────────────────────────

_global_bridge: Optional[RouteBridge] = None


def route_bridge_route(
    *,
    name: str,
    method: str = "GET",
    path: str,
    params: Optional[SchemaMap] = None,
    query: Optional[SchemaMap] = None,
    body: Optional[SchemaMap] = None,
    response: Optional[SchemaMap] = None,
    headers: Optional[Dict[str, str]] = None,
    description: Optional[str] = None,
) -> Callable:
    """
    Module-level decorator - use when you have a global RouteBridge instance.

    You must call ``flask_route_bridge.set_global_bridge(rb)`` first.
    """
    global _global_bridge
    if _global_bridge is None:
        raise RuntimeError(
            "No global RouteBridge set. "
            "Call flask_route_bridge.set_global_bridge(rb) before using @route_bridge_route."
        )
    return _global_bridge.route(
        name=name,
        method=method,
        path=path,
        params=params,
        query=query,
        body=body,
        response=response,
        headers=headers,
        description=description,
    )


def set_global_bridge(rb: RouteBridge) -> None:
    """Set the global RouteBridge instance used by @route_bridge_route."""
    global _global_bridge
    _global_bridge = rb
