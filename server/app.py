from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request

app = Flask(__name__)

SAVE_FILE = Path(__file__).resolve().parent / "saves.json"


def _read_saves() -> Dict[str, Any]:
    if SAVE_FILE.exists():
        try:
            with SAVE_FILE.open("r", encoding="utf-8") as file:
                return json.load(file)
        except json.JSONDecodeError:
            return {}
    return {}


def _write_saves(data: Dict[str, Any]) -> None:
    SAVE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with SAVE_FILE.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)


@app.post("/save")
def save_state():
    payload = request.get_json(silent=True)
    if not payload or "player_id" not in payload or "data" not in payload:
        return jsonify({"error": "Missing player_id or data"}), 400

    player_id = str(payload["player_id"])
    save_data = payload["data"]

    saves = _read_saves()
    saves[player_id] = save_data
    _write_saves(saves)

    return jsonify({"status": "ok"})


@app.get("/load")
def load_state():
    player_id = request.args.get("player_id")
    if not player_id:
        return jsonify({"error": "player_id is required"}), 400

    saves = _read_saves()
    if player_id not in saves:
        return jsonify({"error": "Save not found"}), 404

    return jsonify({"player_id": player_id, "data": saves[player_id]})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

# Example browser usage (JavaScript):
# fetch("http://localhost:5000/save", {
#     method: "POST",
#     headers: { "Content-Type": "application/json" },
#     body: JSON.stringify({ player_id: "demo-player", data: {/* ... */} })
# });
# fetch("http://localhost:5000/load?player_id=demo-player")
#     .then((response) => response.json())
#     .then((data) => console.log(data));
