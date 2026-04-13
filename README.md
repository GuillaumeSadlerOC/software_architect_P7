# Your Car Your Way — Proof of Concept (PoC) Chat

> **Software Architecture Project** — Centralized car rental web application  
> **PoC Scope**: Real-time chat feature between customers and support agents

---

## PoC Objective

This proof of concept validates the **feasibility of the target architecture** designed for the Your Car Your Way platform overhaul, by implementing a single feature: **real-time customer support chat**.

The PoC demonstrates:

| Architectural Aspect | Implementation in the PoC |
|---|---|
| **Frontend / Backend Separation (API-First)** | Next.js (React) consumes a Spring Boot REST API |
| **Real-Time Communication (WebSocket)** | STOMP protocol over SockJS between the browser and Spring Boot |
| **Relational Persistence** | JPA entities (ChatSession, Message) stored in PostgreSQL |
| **Containerization** | 4 Docker containers orchestrated by Docker Compose |
| **Reverse Proxy (Traefik)** | Automatic routing via Docker labels (`/api/*` → backend, `/*` → frontend) |
| **Layered Architecture** | Controller → Service → Repository (Spring Boot) |

> **What this PoC is not**: a final product. Authentication (JWT/OAuth2), multi-country deployment (Ansible), and core business features (booking, payment) are out of scope.

---

## Tech Stack

| Component | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js 14 (React 18) + TypeScript | SSR for SEO, validated internally (CA team) |
| **Backend** | Spring Boot 3.3 (Java 21) | Best performance metrics in the group (US team), native Spring WebSocket |
| **Database** | PostgreSQL 16 | ACID transactions, PostGIS support, write performance |
| **Reverse Proxy** | Traefik v3 | Native Docker integration, automatic TLS (Let's Encrypt in production) |
| **WebSocket** | STOMP + SockJS | Standard protocol, HTTP fallback for browser compatibility |
| **Containerization** | Docker + Docker Compose | Reproducibility, identical to the future production environment |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Server (Docker Compose)                 │
│                                                         │
│  ┌─────────────┐                                        │
│  │  Traefik v3  │ ← :80 / :443                         │
│  │  (Reverse    │                                       │
│  │   Proxy)     │                                       │
│  └──┬───────┬───┘                                       │
│     │       │                                           │
│     │ /*    │ /api/* & /ws/*                             │
│     ▼       ▼                                           │
│  ┌──────┐  ┌──────────────┐     ┌──────────────┐       │
│  │Next.js│  │ Spring Boot  │────▶│ PostgreSQL   │       │
│  │:3000  │  │ :8080        │     │ :5432        │       │
│  │(SSR)  │  │ REST + WS    │     │ (chat_sessions│      │
│  └───────┘  └──────────────┘     │  messages)   │       │
│                                  └──────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- **Docker** ≥ 24.0
- **Docker Compose** ≥ 2.20
- Linux system (Ubuntu 22.04+ recommended)

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/ycyw-poc.git
cd ycyw-poc

# 2. Start the full stack
docker compose up --build

# 3. Access the application
# Frontend (Chat)       : http://localhost
# API Swagger           : http://localhost/api/swagger-ui.html
# Traefik Dashboard     : http://localhost:8080
```

> The first build takes a few minutes (downloading Maven and npm dependencies).  
> Subsequent builds are cached.

---

## Using the PoC

### Chat Demo

1. **Open** `http://localhost` in a browser
2. **Click** "+ New Conversation"
3. **Enter** a name (and optionally an email) → Start
4. **Type** a message as **Client** → the message appears in real time
5. **Toggle** the "Client / Agent" switch in the sidebar
6. **Reply** as **Agent** → the message appears instantly on both sides
7. **Observe** the "typing..." indicator while composing

### Multi-Tab Demo (Real-Time)

1. Open **two browser tabs** at `http://localhost`
2. In tab 1: set role to **Client**, select a session
3. In tab 2: set role to **Agent**, select the same session
4. Messages sent from one tab appear **instantly** in the other

### REST API (Swagger)

Interactive API documentation is available at:  
`http://localhost/api/swagger-ui/index.html`

Available endpoints:

| Method  | Endpoint                        | Description                     |
|---------|---------------------------------|---------------------------------|
| `POST`  | `/api/chat/sessions`            | Create a session                |
| `GET`   | `/api/chat/sessions`            | List all sessions               |
| `GET`   | `/api/chat/sessions/{id}`       | Session details (with messages) |
| `PATCH` | `/api/chat/sessions/{id}/close` | Close a session                 |

---

## Project Structure

```
ycyw-poc/
├── docker-compose.yml                          # 4-container orchestration
├── traefik/
│   └── traefik.yml                             # Reverse proxy configuration
├── backend/                                    # Spring Boot (Java 21)
│   ├── Dockerfile                              # Multi-stage build
│   ├── pom.xml                                 # Maven dependencies
│   └── src/main/java/com/ycyw/chat/
│       ├── ChatApplication.java                # Entry point
│       ├── config/
│       │   ├── WebSocketConfig.java            # STOMP / SockJS configuration
│       │   └── CorsConfig.java                 # CORS policy
│       ├── entity/
│       │   ├── ChatSession.java                # JPA entity (session)
│       │   └── Message.java                    # JPA entity (message)
│       ├── repository/
│       │   ├── ChatSessionRepository.java
│       │   └── MessageRepository.java
│       ├── service/
│       │   └── ChatService.java                # Business logic
│       ├── dto/
│       │   └── ChatDtos.java                   # Data transfer objects (records)
│       └── controller/
│           ├── ChatRestController.java         # REST API (CRUD sessions)
│           ├── ChatWebSocketController.java    # WebSocket (real-time messages)
│           └── GlobalExceptionHandler.java
├── frontend/                                   # Next.js 14 (React / TypeScript)
│   ├── Dockerfile                              # Multi-stage build
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx                      # Root layout
│       │   ├── page.tsx                        # Main page
│       │   └── globals.css                     # Global styles
│       ├── components/
│       │   └── ChatApp.tsx                     # Main chat component
│       └── lib/
│           ├── useChat.ts                      # WebSocket hook (STOMP)
│           └── api.ts                          # REST API client
└── README.md
```

---

## Data Model (PoC)

```
┌──────────────────────┐       ┌───────────────────────┐
│    chat_sessions     │       │      messages         │
├──────────────────────┤       ├───────────────────────┤
│ id          UUID  PK │◄──────│ chat_session_id  FK   │
│ user_name   VARCHAR  │       │ id          UUID  PK  │
│ user_email  VARCHAR  │       │ sender_type ENUM      │
│ status      ENUM     │       │   (CLIENT/AGENT/      │
│   (OPEN/CLOSED)      │       │    SYSTEM)            │
│ created_at  TIMESTAMP│       │ content     TEXT      │
│ closed_at   TIMESTAMP│       │ sent_at     TIMESTAMP │
└──────────────────────┘       └───────────────────────┘
         1                              N
         └──────── contains ────────────┘
```

---

## Useful Commands

```bash
# Stop the stack
docker compose down

# Stop and remove data (volumes)
docker compose down -v

# View logs in real time
docker compose logs -f

# Logs for a specific service
docker compose logs -f backend

# Rebuild a single service
docker compose build backend
docker compose up -d backend
```

---

## Mapping to Target Architecture

This PoC is a **subset** of the production architecture described in the architecture proposal:

| Production                          | PoC                                     |
|-------------------------------------|-----------------------------------------|
| Multi-country OVH servers (Ansible) | Single local server (Docker Compose)    |
| PostgreSQL Primary-Replica          | Single local PostgreSQL instance        |
| Spring Security (JWT + OAuth2)      | No authentication (out of scope)        |
| Next.js with SSR + SEO + i18n       | Next.js with SSR (i18n out of scope)    |
| GitLab CI/CD pipeline               | Local Docker build                      |
| Traefik + TLS Let's Encrypt         | Traefik HTTP (TLS out of scope locally) |

The technical structure (containers, routing, application layers) is **identical** to what will be deployed in production.

---

## Author

Software Architect — Your Car Your Way  
Project completed as part of the Software Architecture program
