# ft_transcendence

A full-stack multiplayer Pong platform featuring real-time gameplay, 3D graphics, OAuth2 authentication, automated matchmaking, and tournament systems. Built with a microservices architecture as part of the 42 curriculum.

**Created by:** caburges, vkazanav, therodri

---

## Features

- **Gameplay**: 2-4 player Pong (local & online), local tournaments, 3D graphics
- **Authentication**: Email/password, OAuth2 (GitHub), Two-Factor Authentication
- **Social**: User profiles, friend system, match history, player statistics
- **Matchmaking**: Automated queue, tournament brackets, game history

---

## Tech Stack

### Frontend
- TypeScript (pure, no frameworks) with custom SPA router
- Tailwind CSS
- Babylon.js for 3D graphics
- Webpack for bundling

### Backend
- Node.js + TypeScript
- Fastify framework
- SQLite databases (one per service)
- WebSocket for real-time communication
- JWT + bcrypt for security

### Architecture
- **Microservices**: Auth, User, Game, Matchmaking
- **Docker** + Docker Compose
- **Nginx** reverse proxy

---

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- GNU Make

### Installation

1. Clone and configure environment:

```bash
git clone https://github.com/047cburgess/pong.git
cd pong
cp .env.example .env
```

2. Edit `.env` with your credentials:

```bash
# Authentication
SECRET=your_secret_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Email (for 2FA)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=your_from_email
```

3. Build and run:

```bash
make up
```

4. Access at **https://localhost:8080**

### Commands

```bash
make        # Build and start all services
make logs   # View service logs
make down   # Stop all services
make ps     # View service status
```

---

## Architecture

### Microservices

**Auth Service** - Authentication, OAuth2, 2FA, JWT management  
**User Service** - Profiles, friends, statistics  
**Game Service** - Real-time game logic, physics, WebSocket state sync  
**Matchmaking Service** - Game coordination, Queue management, custom games, tournaments, match history

### Database Schema

Each service maintains its own SQLite database:

- **authManagement.db**: User credentials, OAuth data, 2FA settings
- **usermanagement.db**: User profiles, friend relationships
- **matchmaking.db**: Games, tournaments, match history, player statistics

---

## Modules 

We chose the following modules to complete this project:

- **Web**: Use a framework to build the backend
- **Web**: Use tailwind CSS to build the frontend
- **Web**: Use a database for the backend
- **User Management**: Standard user management & authentication
- **User Management**: Implement a remote authentication
- **Gameplay and UX**: Multiplayer
- **Gameplay and UX**: Remote players
- **Cybersecurity**: Implement 2FA and JWT
- **Devops**: Design the backend as microservices
- **Graphics**: Use advanced 3d techniques
- **Accessibility**: Expanding browser compatibility
- **Server-Side Pong**: Replace basic Pong with server-side Pong and implement API

---

## 42 Curriculum Constraints

This project adheres to strict requirements:

- **Backend**: Fastify + Node.js only
- **Frontend**: SPA with TypeScript + Tailwind CSS only (no React/Vue/Angular)
- **Database**: SQLite exclusively
- **Philosophy**: Minimal external libraries, core features built from scratch (routing, state management, game logic)

**Justified External Libraries:**
- Fastify (required), bcrypt/JWT (security-critical), Babylon.js (3D rendering engine from scratch exceeds scope)

---

## Future Improvements
- Mobile applications
- Observability stack (Grafana/Prometheus)
- Complete tournament frontend
- Enhanced accessibility & GDPR compliance
- Internationalization
- Additional OAuth providers
- Vault for secrets management
- Rate limiting
- Redis caching
