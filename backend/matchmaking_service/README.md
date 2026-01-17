# Matchmaking Service - Transcendence Pong Project

The matchmaking service is responsible for managing all game-related operations and orchestration including matchmaking queues, custom games, tournaments, and game history.
Its functionality is structured via dedicated Managers for separation of concerns and incremental development and deployment.

---

## ⚙️ Responsibilities

- **Queue Management** - Handle online 2-player matchmaking queue
- **Custom Games** - Enable players to create and manage private 2-4 player custom games with invitations
- **Tournament Management** - Organize 4-player online tournaments with automated bracket generation
- **Game History** - Store all completed games and tournaments
- **Local Games** - Record locally-played games and tournaments for statistics
- **Event Broadcasting** - Real-time game invitation notifications via Server-Sent Events (SSE)
- **Game Registry** - Maintain active game state and lifecycle management
- **Game Service Integration** - Communicate with the game service to start matches

---

## 🏗️ Architecture & Design

- **Manager Pattern:** Each domain (queue, custom games, tournaments, match history) has a dedicated manager for modular development and separation of concerns:
  - **QueueManager** – matchmaking logic  
  - **CustomGameManager** – private games & invitations  
  - **TournamentManager** – tournament orchestration  
  - **GameHistoryManager** – database persistence  
  - **EventManager** – SSE notifications  
  - **GameRegistry** – active game tracking
  
---

## 📚 Key Learning Outcomes

- Designing and implementing **microservices** and inter-service communication  
- Managing **real-time events** with SSE  
- Coordinating **game state** (queues, tournaments, game lifecycle)  
- Structuring backend code with **manager pattern** for modularity
- **Database design** with SQLite
- Use of Typescript and Fastify frameworks  
- Collaborating effectively with Git and a team

---

## 📖 API Documentation

**OpenAPI Specifications:**
- [Public API](./src/schemas/openapi.PublicAPI.yaml) - External endpoints (queue, games, tournaments, stats)
- [Internal API](./src/schemas/openapi.InternalApi.yaml) - Inter-service communication
- [Webhooks](./src/schemas/openapi.Webhooks.yaml) - Game Service callbacks

### Key Endpoints

**Queue Matchmaking**
- `POST /queue/join` - Join matchmaking queue for 2-player game
- `DELETE /queue/leave` - Leave matchmaking queue

**Custom Games (2-4 players)**
- `POST /games/create` - Create custom game and invite players
- `POST /games/:gameId/invite` - Invite additional players (host only)
- `POST /games/:gameId/join` - Accept game invitation
- `POST /games/:gameId/decline` - Decline game invitation
- `GET /games/:gameId` - View game details

**Tournaments (4 players)**
- `POST /tournaments/create` - Create tournament and invite players
- `POST /tournaments/:tournamentId/invite` - Invite additional players (host only)
- `POST /tournaments/:tournamentId/join` - Accept tournament invitation
- `DELETE /tournaments/:tournamentId/decline` - Decline tournament invitation
- `GET /tournaments/:tournamentId/status` - View tournament bracket and game states

**Game History & Statistics**
- `GET /user/stats` - Current user's game statistics
- `GET /user/games` - Current user's online game history (paginated)
- `GET /user/tournaments` - Current user's tournament history (paginated)
- `GET /users/:userId/stats` - Specific user's statistics
- `GET /users/:userId/games` - Specific user's game history (paginated)
- `GET /users/:userId/tournaments` - Specific user's tournament history (paginated)
- `GET /games/:gameId` - Specific game details
- `GET /tournaments/:tournamentId` - Specific tournament details

**Local Games (Frontend Submission)**
- `POST /user/games/local` - Submit locally-played game result
- `POST /user/tournaments/local` - Submit locally-played tournament result
- `GET /user/games/local` - Get user's local game history (paginated)
- `GET /user/tournaments/local` - Get user's local tournament history (paginated)

**Events (SSE)**
- `GET /events` - Establish Server-Sent Events connection for real-time invitations

**Webhooks (Internal - Game Service)**
- `POST /webhooks/games/:gameId/result` - Receive game completion data
- `POST /webhooks/games/:gameId/abandoned` - Receive game abandonment notification

