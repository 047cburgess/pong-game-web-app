# ft_transcendence

*This project has been created as part of the 42 curriculum by caburges, vkazanav, therodri.*

---

## Table of Contents

1. [Description](#description)
2. [Instructions](#instructions)
3. [Technical Stack](#technical-stack)
4. [Database Schema](#database-schema)
5. [Features List](#features-list)
6. [Modules](#modules)
7. [Team Information](#team-information)
8. [Project Management](#project-management)
9. [Individual Contributions](#individual-contributions)
10. [Resources](#resources)

---

## Description

### Project Overview

**ft_transcendence** is a full-stack web application built as part of the 42 curriculum. It is a real-time multiplayer game platform featuring Pong, user authentication, matchmaking, and social features.

### Key Features

- **Real-time Multiplayer Pong Game** - Play classic Pong against other players either on the same keyboard or online on separate computers
- **User Authentication** - Secure login with OAuth2 integration (GitHub) and Two-Factor Authentication (2FA)
- **Matchmaking System** - Real-time queue-based matchmaking for 2 player games
- **User Profiles & Friends** - Manage user profiles, add friends, and view match history
- **Tournament System** - Create and participate in tournaments with bracket management
- **Responsive Web Interface** - Modern, user-friendly frontend with TypeScript and Webpack
- **Microservices Architecture** - Backend built with multiple independent services for independent development and deployment
- **Docker Containerization** - Complete Docker setup for easy deployment and development

---

## Instructions

### Prerequisites

Before running the project, ensure you have the following installed:

- **Docker** (version 20.10+)
- **Docker Compose** (version 1.29+)
- **GNU Make**
- **Node.js** (version 18+) - For local development (optional)
- **Git**

### Environment Configuration

1. Create a `.env` file at the root of the repository:

```bash
cp .env.example .env
```

2. Configure the following environment variables in `.env`:

```
# General
TZ=UTC
NODE_ENV=production
LOG_LEVEL=info
DB_VERBOSE=false

# Authentication
SECRET=[YOUR_SECRET_KEY_HERE]
GITHUB_CLIENT_ID=[YOUR_GITHUB_CLIENT_ID]
GITHUB_CLIENT_SECRET=[YOUR_GITHUB_CLIENT_SECRET]

# Email/SMTP
SMTP_HOST=[YOUR_SMTP_HOST]
SMTP_PORT=587
SMTP_USER=[YOUR_SMTP_USER]
SMTP_PASSWORD=[YOUR_SMTP_PASSWORD]
SMTP_FROM=[YOUR_FROM_EMAIL]

# Service URLs
MATCHMAKING_SERVICE_URL=http://matchmaking-service:3002
USER_SERVICE_URL=http://user-service:3003
GAME_SERVICE_URL=http://game-service:3001
```

### Building and Running

#### Using Make (Recommended)

```bash
# Build and start all services
make

# Or explicitly:
make up

# View logs
make logs

# Stop services
make down

# View service status
make ps
```

### Accessing the Application

Once the services are running:

- **Frontend**: https://localhost:8080
---

## Technical Stack

### Frontend

- **Language**: TypeScript and Babylon.js
- **Build Tool**: Webpack
- **Styling**: Tailwind CSS
- **Architecture**: Single Page Application (SPA)
- **Game Engine**: Custom Canvas-based implementation for Pong

### Backend

#### Auth Service
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Fastify
- **Authentication**: JWT, OAuth2 (GitHub)
- **2FA**: TOTP-based Two-Factor Authentication
- **Email**: SMTP for password reset and 2FA verification

#### Matchmaking Service
- **Runtime**: Node.js
- **Language**: TypeScript
- **Key Features**: Queue management, 2-4 player game creation, online tournament with viewer modes, game history
- **Database**: SQLite with custom schema

#### Game Service
- **Runtime**: Node.js
- **Language**: TypeScript
- **Functionality**: Game state management, real-time game updates

#### User Service
- **Runtime**: Node.js
- **Language**: TypeScript
- **Functionality**: User profile management, statistics, friend lists

### Database

- **Primary**: SQLite
- **Rationale**: Lightweight, no external dependencies, suitable for development and small-scale deployments

### Infrastructure

- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Web Server**: Nginx (reverse proxy, SSL/TLS termination)
- **API Definition**: TypeSpec (for API versioning and documentation)

### Technical Justifications

1. **Microservices**: Allows independent scaling and development of features
2. **TypeScript**: Type safety across the entire stack, reducing bugs
3. **Docker**: Consistent development and production environments
4. **JWT Auth**: Stateless authentication suitable for distributed systems
5. **SQLite**: Simplifies deployment without additional database infrastructure

---

## Database Schema

The project uses three separate SQLite databases, each managed by their respective services:

### Auth Service Database (`authMangement.db`)

#### regular_users
- `id` (INTEGER, Primary Key)
- `username` (TEXT, Unique, Not Null)
- `email` (TEXT, Unique, Not Null)
- `TwoFA` (INTEGER, Default 0) - Boolean flag for two-factor authentication

#### user_info
- `id` (INTEGER, Primary Key, Foreign Key)
- `password` (TEXT, Not Null) - Hashed password for regular users

#### oauth_users
- `id` (INTEGER, Primary Key, Foreign Key)
- `OauthProvider` (TEXT) - OAuth provider name (e.g., "github")
- `externalId` (INTEGER, Unique, Not Null) - Provider's user ID
- Unique constraint on (OauthProvider, externalId)

### User Service Database (`usermanagement.db`)

#### users
- `id` (INTEGER, Primary Key)
- `name` (TEXT, Not Null) - Username
- `last_seen` (INTEGER, Not Null) - Timestamp of last activity

#### friend_requests
- `request_id` (TEXT, Primary Key) - Unique request identifier
- `sender_id` (INTEGER, Not Null, Foreign Key) - References users(id)
- `receiver_id` (INTEGER, Not Null, Foreign Key) - References users(id)
- `status` (INTEGER, Not Null) - Request status (pending, accepted, blocked)
- Indexes on sender_id and receiver_id for performance

### Matchmaking Service Database

#### games
- `game_id` (TEXT, Primary Key)
- `mode` (TEXT, Not Null) - Game mode: 'classic' or 'tournament'
- `tournament_id` (TEXT) - Reference to parent tournament if applicable
- `winner_id` (INTEGER) - ID of winning player
- `date` (DATETIME, Not Null) - Game creation timestamp
- `duration` (TEXT) - Game duration

#### game_participation
- `game_id` (TEXT, Foreign Key) - References games(game_id)
- `user_id` (INTEGER) - Player ID
- `score` (INTEGER, Not Null) - Final score
- `result` (TEXT, Not Null) - Result: 'win', 'loss', or 'draw'
- Composite Primary Key: (game_id, user_id)

#### tournaments
- `tournament_id` (TEXT, Primary Key)
- `semi1_id` (TEXT, Not Null, Foreign Key) - First semifinal game
- `semi2_id` (TEXT, Not Null, Foreign Key) - Second semifinal game
- `final_id` (TEXT, Not Null, Foreign Key) - Final game
- `winner_id` (INTEGER, Not Null) - Tournament winner
- `date` (DATETIME, Not Null) - Tournament date

#### tournament_participation
- `tournament_id` (TEXT, Foreign Key) - References tournaments(tournament_id)
- `user_id` (INTEGER) - Participant ID
- Composite Primary Key: (tournament_id, user_id)

#### local_games
- `game_id` (TEXT, Primary Key)
- `host_id` (INTEGER, Not Null) - Host player ID
- `date` (DATETIME, Not Null) - Game date
- `duration` (TEXT, Not Null) - Game duration
- `winner_type` (TEXT) - Winner: 'host' or 'guest'
- `winner_guest_name` (TEXT) - Name of winning guest (if applicable)

#### local_game_participants
- `game_id` (TEXT, Not Null, Foreign Key) - References local_games(game_id)
- `position` (INTEGER, Not Null, Check 1-4) - Player position (1-4)
- `guest_name` (TEXT) - Name of guest player (if not host)
- `score` (INTEGER, Not Null) - Final score
- Composite Primary Key: (game_id, position)

#### local_tournaments
- `tournament_id` (TEXT, Primary Key)
- `host_id` (INTEGER, Not Null) - Tournament host
- `guest1_name` (TEXT, Not Null) - First guest name
- `guest2_name` (TEXT, Not Null) - Second guest name
- `guest3_name` (TEXT, Not Null) - Third guest name
- `semi1_id` (TEXT, Not Null, Foreign Key) - First semifinal game
- `semi2_id` (TEXT, Not Null, Foreign Key) - Second semifinal game
- `final_id` (TEXT, Not Null, Foreign Key) - Final game
- `winner_type` (TEXT, Not Null) - Winner: 'host' or 'guest'
- `winner_name` (TEXT, Not Null) - Name of tournament winner
- `date` (DATETIME, Not Null) - Tournament date

### Database Relationships

```
Auth Service:
regular_users (1) -----> (1) user_info
regular_users (1) -----> (1) oauth_users

User Service:
users (1) -----> (M) friend_requests (as sender)
users (1) -----> (M) friend_requests (as receiver)

Matchmaking Service:
games (1) -----> (M) game_participation
tournaments (M) -----> (1) games (semi1, semi2, final)
tournaments (1) -----> (M) tournament_participation
local_games (1) -----> (M) local_game_participants
local_tournaments (M) -----> (1) local_games (semi1, semi2, final)
```

---

## Features List

---

## Modules

---

### Project Management Tools

- **Issue Tracking**: [GitHub Issues]
- **Documentation**: [Notion, OpenAPI]

---

## Known Limitations & Future Improvements

### Current Limitations

- [LIMITATION 1]
- [LIMITATION 2]
- [LIMITATION 3]

### Planned Improvements

- Mobile app support
- Monitoring with Grafana && Prometheus
- Frontend development of online tournaments (already ready in backend)
- Frontend accessibility
