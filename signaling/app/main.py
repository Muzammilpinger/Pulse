"""A bounded two-peer signaling room. One replica by design; media is peer-to-peer."""

import json
import os
import re

import jwt
from fastapi import FastAPI, Response, WebSocket, WebSocketDisconnect
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

app = FastAPI(title="Pulse Signaling")
connections = {}
CALL_RESULTS = Counter("pulse_voice_peer_results", "Untrusted browser-reported peer connection outcomes", ["outcome"])
SECRET = os.environ.get("SESSION_SECRET", "")
if len(SECRET) < 32:
    raise RuntimeError("SESSION_SECRET must contain at least 32 characters")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.websocket("/ws/{room}")
async def signaling(websocket: WebSocket, room: str, token: str = ""):
    try:
        jwt.decode(token, SECRET, algorithms=["HS256"], options={"require": ["exp", "sub"]})
    except jwt.InvalidTokenError:
        await websocket.close(code=4401)
        return
    origin = websocket.headers.get("origin")
    if not re.fullmatch(r"[a-z0-9-]{1,40}", room) or (
        origin
        and origin
        not in os.getenv("ALLOWED_ORIGINS", "http://localhost:8085,http://localhost:5173").split(
            ","
        )
    ):
        await websocket.close(code=4403)
        return
    await websocket.accept()
    peers = connections.setdefault(room, set())
    if len(peers) >= 2:
        await websocket.send_json(
            {"type": "error", "message": "This voice room already has two people."}
        )
        await websocket.close(code=4409)
        return
    reported = set()
    existing_peers = tuple(peers)
    peers.add(websocket)
    try:
        await websocket.send_json({"type": "waiting"})
        if existing_peers:
            for peer in tuple(peers):
                await peer.send_json({"type": "peer-ready", "initiator": peer != websocket})
        while True:
            raw = await websocket.receive_text()
            if len(raw) > 16000:
                await websocket.close(code=1009)
                break
            try:
                message = json.loads(raw)
                if not isinstance(message, dict) or message.get("type") not in {
                    "offer",
                    "answer",
                    "ice-candidate",
                    "peer-state",
                }:
                    raise ValueError()
            except (ValueError, TypeError):
                await websocket.send_json(
                    {"type": "error", "message": "Invalid signaling message."}
                )
                continue
            if message["type"] == "peer-state":
                outcome = message.get("state")
                if outcome in {"connected", "failed"} and outcome not in reported:
                    CALL_RESULTS.labels(outcome).inc()
                    reported.add(outcome)
                continue
            for peer in tuple(peers):
                if peer != websocket:
                    await peer.send_json(message)
    except WebSocketDisconnect:
        pass
    finally:
        peers.discard(websocket)
        for peer in tuple(peers):
            try:
                await peer.send_json({"type": "peer-left"})
            except Exception:
                pass
        if not peers:
            connections.pop(room, None)
