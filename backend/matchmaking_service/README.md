# Matchmaking Service

The matchmaking service is responsible for managing all game-related operations and orchestration including matchmaking queues, custom games, tournaments, and game history.
Its functionality is structured via dedicated Managers for separation of concerns and incremental development and deployment.

---

## Responsibilities

### Core Functions

- **Queue Management** - Handle online 2-player matchmaking queue
- **Custom Games** - Enable players to create and manage private 2-4 player custom games with invitations
- **Tournament Management** - Organize 4-player online tournaments with automated bracket generation
- **Game History** - Store all completed games and tournaments
- **Local Games** - Record locally-played games and tournaments for statistics
- **Event Broadcasting** - Real-time game invitation notifications via Server-Sent Events (SSE)
- **Game Registry** - Maintain active game state and lifecycle management
- **Game Service Integration** - Communicate with the game service to start matches

### Key Managers

- **QueueManager** - Matchmaking queue logic and pairing
- **CustomGameManager** - Custom game creation, invitations, and lifecycle
- **TournamentManager** - Online tournaments, handling lifecycle, bracket advancement, viewer mode
- **GameHistoryManager** - Database operations for game records and statistics
- **EventManager** - SSE connections and real-time event distribution
- **GameRegistry** - Centralized active game tracking and type identification for route handlers

---

## API Documentation

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

## Architecture

### Design Philosophy

The service uses a **Manager pattern** for separation of concerns and incremental development and deployment. Each manager handles a specific domain (queue, custom games, tournaments) and operates independently while sharing common infrastructure (events, registry, database).

### Manager Interactions

```
Route Handler
    ↓
Game-Specific Manager (Queue/Custom/Tournament)
    ↓ coordinates
    ├→ GameServiceClient    (start games on game service)
    ├→ EventManager         (send SSE notifications)
    ├→ GameRegistry         (track active games)
    └→ GameHistoryManager   (persist results to database)
```

**Flow Example (Custom Game):**
1. Route handler receives `POST /games/create`
2. CustomGameManager creates game via GameServiceClient
3. CustomGameManager registers game in GameRegistry (for routing webhooks)
4. CustomGameManager sends invites via EventManager (SSE)
5. When game completes, webhook → CustomGameManager → GameHistoryManager saves to DB

### Fastify Plugin System

The service uses Fastify's plugin system for modularity:


### Event Flow

1. **Queue Matching**
   - Player joins queue → First player sent to a waiting game with Game Service → Second player joins the waiting game and the game begins → Result webhook → History saved

2. **Custom Game**
   - Host creates game → Sends invites → Players join → Game starts when full → Result webhook → History saved

3. **Tournament**
   - Host creates tournament → Players invited → Players accept → Semifinals played → Winners advance → Final played → Complete

4. **Game Completion**
   - Game service sends webhook → Manager processes result → Saves to database

### Authentication

All routes require authentication via the `x-user-id` header, which is set by the reverse proxy after JWT validation.

---

## Server-Sent Events (SSE)

The service uses SSE for real-time push notifications to connected clients. Players establish a long-lived connection via `GET /events` and receive invite notifications.


**Connection Management:**
- Heartbeat pings sent every 30 seconds (`:ping\n\n`)
- Automatic cleanup on client disconnect
- Only invited players receive notifications (not broadcast to all users)All routes require authentication via the `x-user-id` header, which is set by the reverse proxy after JWT validation

