# ft_transcendence - Multiplayer Pong Web Application

A full-stack multiplayer Pong platform built with a microservices architecture as the final project for **Ecole 42s core curriculum**. The project was developed as a team of 3, focusing on learning fullstack design, backend services, real-time communication, and collaborative development.

**Created by:** caburges, vkazanav, therodri

---

## 🎮 Features

- Real-time multiplayer gameplay (2-4 players)
- Online, local and tournament modes
- Quick play matchmaking system
- Match history and player statistics
- User authentication and profiles

---

## 🛠️ Tech Stack

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

---

## 🏗️ Architecture

The application uses a **microservices architecture** with the following services:

- **User Service:** User management and profiles  
- **Auth Service:** Authentication and authorization  
- **Game Service:** Real-time game logic and state management  
- **Matchmaking Service:** Queue management, game and tournament orchestration, match history  
- **Frontend:** User interface and real-time communication  

*As part of a team project, responsibilities were shared and decisions were made collaboratively.*

---

## 🧩 My Contributions

Within the team, I focused on the **matchmaking backend service** and contributing to the microservices architecture. My work included:

- Implementing the **queue system** for player matchmaking  
- Managing **game lifecycle** (creation, start, completion)
- Implementing **Server Side Events** for game invitations and registration  
- Handling **tournament orchestration**  
- Persisting **match history** in SQLite  
- Building **RESTful APIs** for inter-service communication  

## 🚀 Quick Start

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
- Complete online tournament frontend
- Enhanced accessibility & GDPR compliance
- Internationalization
- Additional OAuth providers
- Vault for secrets management
- Rate limiting
- Redis caching
