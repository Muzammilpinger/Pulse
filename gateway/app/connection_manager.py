import asyncio


class ConnectionManager:
    def __init__(self):
        self.rooms = {}

    async def connect(self, websocket, room):
        await websocket.accept()
        self.rooms.setdefault(room, set()).add(websocket)

    def disconnect(self, websocket, room):
        connections = self.rooms.get(room, set())
        connections.discard(websocket)
        if not connections:
            self.rooms.pop(room, None)

    async def broadcast_to_room(self, room, message):
        async def send(connection):
            try:
                await asyncio.wait_for(connection.send_json(message), timeout=3)
            except Exception:
                self.disconnect(connection, room)
                try:
                    await connection.close(code=1013)
                except Exception:
                    pass

        await asyncio.gather(*(send(c) for c in tuple(self.rooms.get(room, ()))))

    async def close(self):
        for room, connections in tuple(self.rooms.items()):
            for connection in tuple(connections):
                try:
                    await connection.close(code=1012)
                except Exception:
                    pass
