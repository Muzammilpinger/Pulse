# Pulse

> A real-time communication platform built from scratch with WebSockets, FastAPI, Redis, PostgreSQL, and React.

Pulse is a real-time chat system designed to explore how modern communication infrastructure works under the hood.

Instead of relying on a third-party realtime service, Pulse implements its own WebSocket communication layer, Redis Pub/Sub messaging pipeline, presence system, persistent message history, and React client.

## V1

**Pulse V1 is a functional real-time chat platform.**

### Features

* Real-time messaging with WebSockets
* Multiple users and chat rooms
* Persistent message history
* Redis Pub/Sub message distribution
* Online/offline presence
* Automatic message scrolling
* Realtime connection status
* React-based interface
* FastAPI backend
* PostgreSQL persistence
* Docker support
* Basic automated testing

---

## Architecture

```text
                         ┌──────────────────┐
                         │     React UI      │
                         │                  │
                         │  Chat / WebSocket │
                         └────────┬─────────┘
                                  │
                           WebSocket / HTTP
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │      Pulse Gateway      │
                    │        FastAPI          │
                    │                         │
                    │  WebSocket Connections │
                    │  REST API              │
                    │  Connection Manager    │
                    └───────┬─────────┬───────┘
                            │         │
                       Pub/Sub        │ SQL
                            │         │
                            ▼         ▼
                    ┌────────────┐  ┌────────────┐
                    │   Redis    │  │ PostgreSQL │
                    │            │  │            │
                    │ Pub/Sub    │  │ Messages   │
                    │ Presence   │  │ History    │
                    └────────────┘  └────────────┘
```

### Message flow

When a user sends a message:

```text
Browser
   │
   │ WebSocket
   ▼
FastAPI Gateway
   │
   │ Save
   ▼
PostgreSQL
   │
   │ Publish
   ▼
Redis Pub/Sub
   │
   │ Subscribe
   ▼
Gateway Redis Listener
   │
   │ Broadcast
   ▼
Connected WebSocket clients
```

This allows the gateway to separate message persistence from realtime message distribution.

---

## Presence

Pulse also maintains a realtime presence system using Redis.

```text
User connects
      │
      ▼
Redis SET
pulse:presence
      │
      ▼
Presence event published
      │
      ▼
Connected clients
      │
      ▼
Online user list updated
```

When a WebSocket disconnects, the user's presence state is removed and an offline event is published.

---

## Tech Stack

### Frontend

* React
* Vite
* Native WebSocket API

### Backend

* Python
* FastAPI
* Uvicorn
* SQLAlchemy
* WebSockets

### Infrastructure

* Redis
* PostgreSQL
* Docker
* Docker Compose

### Testing

* Pytest

---

## Project Structure

```text
pulse-app/
│
├── client/
│   ├── src/
│   │   ├── chat/
│   │   │   ├── Chat.jsx
│   │   │   ├── Chat.css
│   │   │   └── websocket.js
│   │   ├── call/
│   │   └── components/
│   ├── index.html
│   ├── package.json
│   └── package-lock.json
│
├── gateway/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   ├── messages.py
│   │   │   └── websocket.py
│   │   ├── connection_manager.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── pubsub.py
│   │
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── signaling/
│
├── docs/
│   ├── adr/
│   ├── ARCHITECTURE.md
│   ├── LOAD_TEST_RESULTS.md
│   ├── RUNBOOK.md
│   └── THREAT_MODEL.md
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Running Locally

### 1. Clone

```bash
git clone <repository-url>
cd pulse-app
```

### 2. Backend

Create a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r gateway/requirements.txt
```

Start Redis and PostgreSQL using Docker:

```bash
docker compose up -d
```

Start the FastAPI gateway:

```bash
uvicorn app.main:app --reload --port 8001
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the required database and Redis connection values.

`.env` is intentionally excluded from Git.

---

## V1 Limitations

Pulse V1 is intentionally focused on the core realtime architecture.

The following are planned rather than production-ready:

* Authentication
* Private rooms
* Message delivery guarantees
* Horizontal gateway scaling
* Production deployment
* Kubernetes orchestration
* Advanced observability
* Voice/video calling

These are planned for future versions.

---

## Roadmap

### V1 — Realtime Chat

* [x] React client
* [x] FastAPI gateway
* [x] WebSocket messaging
* [x] Redis Pub/Sub
* [x] Persistent messages
* [x] Presence
* [x] Docker infrastructure
* [x] Basic tests
* [x] Documentation

### V2 — Distributed System

* [ ] Authentication
* [ ] User accounts
* [ ] Private rooms
* [ ] Improved presence architecture
* [ ] Multiple gateway instances
* [ ] Redis-backed distributed coordination
* [ ] Load testing

### V3 — Production Infrastructure

* [ ] Dockerized production deployment
* [ ] Kubernetes
* [ ] Ingress
* [ ] Horizontal scaling
* [ ] Helm
* [ ] CI/CD
* [ ] Prometheus
* [ ] Grafana
* [ ] Centralized logging

### V4 — Communication Platform

* [ ] Voice calls
* [ ] Video calls
* [ ] WebRTC
* [ ] File sharing
* [ ] Notifications
* [ ] Message delivery/read states

---

## Why Pulse?

Pulse is primarily a learning and engineering project.

The goal is to understand the infrastructure behind realtime applications rather than simply assembling existing services.

The project provides practical experience with:

* Event-driven architecture
* WebSockets
* Pub/Sub systems
* Async Python
* Database persistence
* Distributed systems concepts
* Containerization
* Realtime state management
* Backend/frontend communication
* Production infrastructure

---

## Status

**Current release: V1.0.0**

Pulse V1 is functional and focused on demonstrating the core realtime communication architecture.

Built as an engineering and learning project.
