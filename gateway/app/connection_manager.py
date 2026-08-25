import json

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, set[WebSocket]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        room_id: str,
    ):
        await websocket.accept()

        if room_id not in self.rooms:
            self.rooms[room_id] = set()

        self.rooms[room_id].add(websocket)

    def disconnect(
        self,
        websocket: WebSocket,
        room_id: str,
    ):
        if room_id not in self.rooms:
            return

        self.rooms[room_id].discard(websocket)

        if not self.rooms[room_id]:
            del self.rooms[room_id]

    async def send_personal_message(
        self,
        message: str,
        websocket: WebSocket,
    ):
        await websocket.send_text(message)

    async def broadcast_to_room(
        self,
        room_id: str,
        message: dict,
    ):
        connections = self.rooms.get(room_id, set())
        disconnected = set()

        for connection in connections:
            try:
                await connection.send_text(
                    json.dumps(message)
                )
            except Exception as error:
                print(
                    f"❌ Failed to send to WebSocket: {error}"
                )
                disconnected.add(connection)

        for connection in disconnected:
            self.disconnect(connection, room_id)

    async def broadcast_to_all(
        self,
        message: dict,
    ):
        for room_id in list(self.rooms.keys()):
            await self.broadcast_to_room(
                room_id,
                message,
            )

