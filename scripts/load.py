"""Measured cross-gateway fan-out. Usage: python scripts/load.py --clients 50 --messages 10."""

import argparse
import asyncio
import json
import platform
import statistics
import time
import uuid

import httpx
from websockets.asyncio.client import connect


async def run(clients, messages):
    room = "load-" + uuid.uuid4().hex[:8]
    async with httpx.AsyncClient() as http:
        token = (await http.post("http://localhost:8001/session", json={"username": room})).json()[
            "token"
        ]
    sockets = []
    start = time.perf_counter()
    try:
        for i in range(clients):
            port = 8001 if i % 2 == 0 else 8011
            socket = await connect(f"ws://localhost:{port}/ws?room={room}&token={token}")
            while json.loads(await socket.recv())["type"] != "ready":
                pass
            sockets.append(socket)
        connect_seconds = time.perf_counter() - start
        latencies = []

        async def receive(socket, content, sent):
            async with asyncio.timeout(15):
                while True:
                    item = json.loads(await socket.recv())
                    if item.get("content") == content:
                        latencies.append((time.perf_counter() - sent) * 1000)
                        return

        test_start = time.perf_counter()
        for i in range(messages):
            sent = time.perf_counter()
            content = f"load-{i}-{sent}"
            await sockets[0].send(content)
            await asyncio.gather(*(receive(s, content, sent) for s in sockets))
            await asyncio.sleep(0.55)  # Respect per-guest rate limit.
        duration = time.perf_counter() - test_start
        return {
            "environment": platform.platform(),
            "clients": clients,
            "messages": messages,
            "deliveries": len(latencies),
            "connection_seconds": round(connect_seconds, 3),
            "duration_seconds": round(duration, 3),
            "latency_ms": {
                "p50": round(statistics.median(latencies), 2),
                "p95": round(sorted(latencies)[int(0.95 * (len(latencies) - 1))], 2),
                "max": round(max(latencies), 2),
            },
            "errors": 0,
            "note": "Sequential message fan-out; includes deliberate 550ms pacing. Not a saturation benchmark.",
        }
    finally:
        await asyncio.gather(*(s.close() for s in sockets))


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--clients", type=int, default=50)
    p.add_argument("--messages", type=int, default=10)
    args = p.parse_args()
    print(json.dumps(asyncio.run(run(args.clients, args.messages)), indent=2))
