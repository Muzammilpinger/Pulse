from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI(title="Pulse Signaling Service")

connections: dict[str, set[WebSocket]] = {}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/{room}")
async def signaling(websocket: WebSocket, room: str):
    await websocket.accept()

    if room not in connections:
        connections[room] = set()

    connections[room].add(websocket)

    try:
        while True:
            message = await websocket.receive_text()

            for connection in connections[room]:
                if connection != websocket:
                    await connection.send_text(message)

    except WebSocketDisconnect:
        connections[room].remove(websocket)

        if not connections[room]:
            del connections[room]