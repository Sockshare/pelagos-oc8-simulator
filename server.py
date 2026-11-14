#!/usr/bin/env python3
"""
Pelagos OC-8 (Robotic Octopus) & Hexapod HX-18 (18-DOF Walker) — 3D Teardown Field Simulator Server
Serves the 1600x900 8-panel interactive 3D simulator on Port 8104 (bound to 0.0.0.0) and integrates
with Run Nexus.
"""

import argparse
import base64
import os
from typing import Any

from flask import Flask, Response, jsonify, render_template, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, template_folder="templates", static_folder=STATIC_DIR)
app.config["TEMPLATES_AUTO_RELOAD"] = True

SIM_METADATA = {
    "app": "Pelagos OC-8 & 18-DOF Hexapod // 3D Robotics Teardown Field Simulator",
    "port": 8104,
    "units": [
        {
            "id": "oc8",
            "code": "OC-8",
            "name": "Pelagos OC-8",
            "category": "Robotic Cephalopod · Eight-Arm Subsea Drone",
            "links": 202,
            "suction_wheels": 409,
            "assemblies": ["HERO", "OPTICS", "MANTLE", "ARM R2", "SIPHON", "BEAK"],
            "displays": ["LABELS", "EXPLODED", "JET WAKE", "TURNTABLE"],
        },
        {
            "id": "hx18",
            "code": "HX-18",
            "name": "Hexapod HX-18",
            "category": "Robotic Arthropod · 18-DOF Six-Legged Walker",
            "legs": 6,
            "servos": 18,
            "joints_per_leg": ["COXA", "FEMUR", "TIBIA"],
            "assemblies": ["HERO", "OPTICS", "CHASSIS", "LEG L2", "SERVOS", "CORE"],
            "displays": ["LABELS", "EXPLODED", "GAIT TRACE", "TURNTABLE"],
        },
    ],
}


@app.after_request
def add_cors_headers(response: Any) -> Any:
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/")
def index_page() -> Any:
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon() -> Any:
    return Response(status=204)


@app.route("/static/<path:filename>")
def serve_static_file(filename: str) -> Any:
    return send_from_directory(STATIC_DIR, filename)


@app.route("/api/health", methods=["GET"])
def api_health() -> Any:
    return jsonify({"ok": True, **SIM_METADATA})


@app.route("/api/export/offline.html", methods=["GET"])
def export_offline_html() -> Response:
    """Bundles Three.js, fonts, CSS, and simulator JS into a single offline HTML file."""
    html = open(os.path.join(BASE_DIR, "templates", "index.html"), encoding="utf-8").read()
    css = open(os.path.join(STATIC_DIR, "pelagos_sim.css"), encoding="utf-8").read()
    three_js = open(os.path.join(STATIC_DIR, "three.min.js"), encoding="utf-8").read()
    sim_js = open(os.path.join(STATIC_DIR, "pelagos_sim.js"), encoding="utf-8").read()

    # Inline woff2 fonts as base64 data URIs
    for fname in [
        "inter-latin-wght-normal.woff2",
        "jetbrains-mono-latin-400-normal.woff2",
        "jetbrains-mono-latin-600-normal.woff2",
        "jetbrains-mono-latin-700-normal.woff2",
    ]:
        fpath = os.path.join(STATIC_DIR, "fonts", fname)
        if os.path.exists(fpath):
            b64 = base64.b64encode(open(fpath, "rb").read()).decode("ascii")
            css = css.replace(f"/static/fonts/{fname}", f"data:font/woff2;base64,{b64}")

    html = html.replace('<link rel="stylesheet" href="/static/pelagos_sim.css" />', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="/static/three.min.js"></script>', f"<script>\n{three_js}\n</script>")
    html = html.replace('<script src="/static/pelagos_sim.js"></script>', f"<script>\n{sim_js}\n</script>")

    return Response(
        html,
        mimetype="text/html",
        headers={"Content-Disposition": 'attachment; filename="pelagos-oc8-live.html"'},
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Pelagos OC-8 & Hexapod HX-18 Field Simulator Server")
    parser.add_argument("--host", default=os.environ.get("HOST", "0.0.0.0"), help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8104")), help="Bind port (default: 8104)")
    args = parser.parse_args()
    app.run(host=args.host, port=args.port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
