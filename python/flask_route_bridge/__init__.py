"""
flask_route_bridge
==================

Flask integration for route-bridge.

Usage::

    from flask import Flask
    from flask_route_bridge import RouteBridge

    app = Flask(__name__)
    rb = RouteBridge(app, manifest_path="./route-bridge.manifest.json")

    @rb.route(
        name="getUsers",
        method="GET",
        path="/users",
        query={"page": "number?", "limit": "number?"},
        response={"users": "any", "total": "number"},
        description="List all users"
    )
    def get_users(body, query, params, request):
        page = query.get("page", 1)
        return {"users": [], "total": 0}

    rb.write_manifest()
"""

from .bridge import RouteBridge, route_bridge_route

__all__ = ["RouteBridge", "route_bridge_route"]
__version__ = "0.1.0"
