"""Real PostgreSQL/Redis, two independent gateway processes. Run after Compose."""

import asyncio
import json
import os
import uuid

import httpx
import pytest
from websockets.asyncio.client import connect
from websockets.exceptions import InvalidStatus

A = os.getenv("GATEWAY_A", "http://localhost:8001")
B = os.getenv("GATEWAY_B", "http://localhost:8011")
SIGNAL = os.getenv("SIGNALING", "http://localhost:8002")


def session(name):
    r = httpx.post(f"{A}/session", json={"username": name})
    r.raise_for_status()
    return r.json()["token"]


def ws(base, room, token):
    return f"{base.replace('http', 'ws')}/ws?room={room}&token={token}"


async def event(socket, kind):
    async with asyncio.timeout(12):
        while True:
            data = json.loads(await socket.recv())
            if data["type"] == kind:
                return data


def test_health_and_auth_boundaries():
    assert httpx.get(f"{A}/ready").status_code == 200
    assert httpx.get(f"{B}/ready").status_code == 200
    assert httpx.get(f"{A}/rooms/general/messages").status_code == 401
    assert httpx.post(f"{A}/session", json={"username": "<script>"}).status_code == 422
    token = session("boundary")
    assert (
        httpx.get(
            f"{A}/rooms/INVALID/messages", headers={"Authorization": f"Bearer {token}"}
        ).status_code
        == 422
    )
    assert "pulse_connections" in httpx.get(f"{A}/metrics").text


def test_cross_gateway_delivery_history_validation_and_presence():
    async def run():
        room = "test-" + uuid.uuid4().hex[:8]
        ta, tb = session("alice"), session("bob")
        async with connect(ws(A, room, ta)) as a, connect(ws(B, room, tb)) as b:
            ready_a, ready_b = await event(a, "ready"), await event(b, "ready")
            assert ready_a["instance"] != ready_b["instance"]
            presence = await event(b, "presence_list")
            assert set(presence["users"]) == {"alice", "bob"}
            await a.send("cross-replica hello")
            received = await event(b, "message")
            assert received["content"] == "cross-replica hello"
            assert received["sender_id"] == "alice"
            echoed = await event(a, "message")
            assert echoed["id"] == received["id"]
            await a.send(" " * 5)
            assert "4000" in (await event(a, "error"))["message"]
            await a.send("x" * 4001)
            assert (await event(a, "error"))["type"] == "error"
        rows = httpx.get(
            f"{B}/rooms/{room}/messages", headers={"Authorization": f"Bearer {tb}"}
        ).json()
        assert len(rows) == 1 and rows[0]["id"] == received["id"]
        assert (
            httpx.get(
                f"{A}/rooms/{room}/messages?before={received['id']}",
                headers={"Authorization": f"Bearer {ta}"},
            ).json()
            == []
        )

    asyncio.run(run())


def test_websocket_rejects_bad_token_and_origin():
    async def run():
        with pytest.raises(InvalidStatus):
            async with connect(ws(A, "general", "fake")):
                pass
        with pytest.raises(InvalidStatus):
            async with connect(
                ws(A, "general", session("origin-test")),
                origin="https://untrusted.example",
            ):
                pass

    asyncio.run(run())


def test_room_isolation_and_multiple_tabs():
    async def run():
        ta = session("tabs")
        room = "tabs-" + uuid.uuid4().hex[:8]
        async with (
            connect(ws(A, room, ta)) as first,
            connect(ws(B, room, ta)) as second,
        ):
            await event(first, "ready")
            await event(second, "ready")
            await first.close()
            async with connect(ws(A, room, session("observer"))) as observer:
                assert "tabs" in (await event(observer, "presence_list"))["users"]
            async with connect(ws(A, room + "-other", session("outsider"))) as outsider:
                assert "tabs" not in (await event(outsider, "presence_list"))["users"]
                await second.send("private-to-room")
                with pytest.raises(TimeoutError):
                    async with asyncio.timeout(0.5):
                        await event(outsider, "message")

    asyncio.run(run())


def test_signaling_negotiation_capacity_and_cleanup():
    async def run():
        room = "call-" + uuid.uuid4().hex[:8]
        url = f"{SIGNAL.replace('http', 'ws')}/ws/{room}?token={session('caller')}"
        async with connect(url) as a, connect(url) as b:
            assert (await event(a, "peer-ready"))["initiator"] is True
            assert (await event(b, "peer-ready"))["initiator"] is False
            async with connect(url) as c:
                assert "two people" in (await event(c, "error"))["message"]
            await a.send(json.dumps({"type": "offer", "sdp": "test-sdp"}))
            assert (await event(b, "offer"))["sdp"] == "test-sdp"
            await b.send("invalid-json")
            assert (await event(b, "error"))["message"] == "Invalid signaling message."
            await b.close()
            await event(a, "peer-left")

    asyncio.run(run())


def test_voice_outcomes_are_bounded_and_not_forwarded():
    def count():
        rows = httpx.get(f"{SIGNAL}/metrics").text.splitlines()
        return sum(
            float(row.split()[-1])
            for row in rows
            if row.startswith('pulse_voice_peer_results_total{outcome="connected"}')
        )

    async def run():
        before = count()
        url = f"{SIGNAL.replace('http', 'ws')}/ws/metrics-{uuid.uuid4().hex[:8]}?token={session('metrics')}"
        async with connect(url) as a, connect(url) as b:
            await event(a, "peer-ready")
            await event(b, "peer-ready")
            for state in ["connected", "connected", "arbitrary-label"]:
                await a.send(json.dumps({"type": "peer-state", "state": state}))
            await a.send(json.dumps({"type": "offer", "sdp": "barrier"}))
            # The next peer event must be the offer, not telemetry.
            assert json.loads(await b.recv()) == {"type": "offer", "sdp": "barrier"}
            assert count() == before + 1
            assert "arbitrary-label" not in httpx.get(f"{SIGNAL}/metrics").text

    asyncio.run(run())
