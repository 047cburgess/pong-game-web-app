// TODO: Implement mechanism to handle abandonments/non joined tournaments and games. Most critical for tournaments which has progression
// 	Custom game: if not everyone joined and marked as ready, mark game as cancelled (game service send to inform matchmaking?)
// TOURNAMENT GAME: token expired and game hasn't started. Force winner to the person who connected
// TOURNAMENT GAME: token expired and no one joined -> pick random winner
// GAME: token expired and no one connected -> remove the game -> matchmaking has its own clean up mechanism





import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import { z } from 'zod';
import { Game, gamePropertiesSchema, } from './game.js';
import type { GameId, PlayerId, PlayerSocket, PlayerInput, GameProperties } from './game.js';
import { config } from './config.js';

const envToLogger = {
  development: {
    level: config.LOG_LEVEL === 'info' ? 'debug' : config.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true
      }
    }
  },
  production: {
    level: config.LOG_LEVEL === 'info' ? 'warn' : config.LOG_LEVEL
  },
  test: false
};

const games = new Map<GameId, Game>();
const tokenMap = new Map<string, {
  playerId: PlayerId;
  gameId: GameId;
  expires: number;
}>();

function createToken(playerId: PlayerId, gameId: GameId, ttlMs = 5 * 60_000) {
  const t = randomUUID();
  tokenMap.set(t, {
    playerId,
    gameId,
    expires: Date.now() + ttlMs
  });
  return t;
}

// Validates token and deletes it from the token map if it's expired
function validateToken(t: string) {
  const s = tokenMap.get(t);
  if (!s) {
    return null;
  }
  if (s.expires < Date.now()) {
    tokenMap.delete(t);
    return null;
  }
  return s;
}
// function revokeToken(t: string) { tokenMap.delete(t); }

const fastify = Fastify({
  logger: envToLogger[config.NODE_ENV as keyof typeof envToLogger] ?? true
});

await fastify.register(cors, {
	origin: true, 
	credentials: true
});

fastify.register(websocketPlugin);

// ROUTE 
// FOR CLASSIC GAME (MATCHMAKING 2PL OR 2-4PL CUSTOM)
// ROUTE FOR CLASSIC GAME (MATCHMAKING 2PL OR 2-4PL CUSTOM)
  fastify.post('/internal/games/classic/create', async (req, resp) => {

    fastify.log.debug('Entered /internal/games/classic/create');

    let gameParams: GameProperties;
    try {
      gameParams = gamePropertiesSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return resp.status(400).send({
          errors: error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message
          })),
        });
      }
      return resp.status(500).send({ error: 'Server error' });
    }

    const gameId = randomUUID();
    const hookUrl = (req.body as any)?.hook?.replace('GAME_ID', gameId);
    const game = new Game(gameId, gameParams, hookUrl);
    games.set(gameId, game);

    // BUILD THE RESPONSE GAME KEYS
    const gameKeys = Array.from({ length: gameParams.nPlayers }).map(() => {
      const playerId = randomUUID();
      const key = createToken(playerId, gameId);
      const tokenData = tokenMap.get(key)!;

      return {
        key,
        gameId,
        expires: new Date(tokenData.expires).toISOString()
      };
    });

    return { gameKeys };
  });

// FOR CREATING TOURNAMENT GAME
  fastify.post('/internal/games/tournament/create', async (req, resp) => {

    fastify.log.debug('Entered /internal/games/tournament/create');

    let gameParams: GameProperties;
    try {
      gameParams = gamePropertiesSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return resp.status(400).send({
          errors: error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message
          })),
        });
      }
      return resp.status(500).send({ error: 'Server error' });
    }

    const gameId = randomUUID();
    const hookUrl = (req.body as any)?.hook?.replace('GAME_ID', gameId);
    gameParams.isTournament = true; // ADDED
    fastify.log.debug(`GameParams.isTournament = ${gameParams.isTournament}`);
    const game = new Game(gameId, gameParams, hookUrl);
    games.set(gameId, game);

    // BUILD THE RESPONSE GAME KEYS
    const gameKeys = Array.from({ length: gameParams.nPlayers }).map(() => {
      const playerId = randomUUID();
      const key = createToken(playerId, gameId);
      const tokenData = tokenMap.get(key)!;
      return {
        key,
        gameId,
        expires: new Date(tokenData.expires).toISOString()
      };
    });

    return { viewingKey: game.viewingKey, gameKeys };
  });


// ROUTE FOR PLAYERS TO CONNECT TO PLAY && SPECTATORS TO SPECTATE
fastify.register(async function(fastify) {
  fastify.get<{
    Querystring: { token: string; userId?: string },
  }>('/ws', { websocket: true, },
    (ws, req) => {

      const token = req.query.token;
      const userId = req.query.userId ? Number(req.query.userId) : undefined;


      fastify.log.debug(`Connection: Token: ${token}, UserId: ${userId ?? 'unregistered'}`);

      // Check if valid player token
      let isViewer = false;
      let playerId: PlayerId;
      let game: Game | null = null;

      // Is a player token or a viewerkey. player token can be expired, viewer key doesn't expire but wont exist if game has finished
     if (token.startsWith("view_")) {
      	fastify.log.debug(`Token: ${token} is a VIEWER, UserId - ${userId}`);
	     isViewer = true;
	     const foundGame = Array.from(games.values()).find(g => g.viewingKey === token);
	     game = foundGame !== undefined ? foundGame : null;
	     if (!game) {
		     fastify.log.debug(`Game not found`);
        	try { ws.close(4001, 'unauthorized'); } catch { }
        	return;
	     }
	     playerId = game.viewingKey + randomUUID();
     } else {
      const meta = validateToken(token); // checks if its valid or expired
      game = meta ? (games.get(meta.gameId) ?? null) : null;
      
      if (!meta || !game) {

        try { ws.close(4001, 'unauthorized'); } catch { }
        return;
      }
      playerId = meta.playerId;

     } 

      const pSock: PlayerSocket = { 
	      id: playerId,
	      userId,
	      ws,
	      isViewer,
      };

      game.addPlayer(pSock);
      fastify.log.debug(`successfully added player ${token}`);
      // revokeToken(token); // don't revoke so players can reconnect

      ws.on('message', (raw: any) => {
	if (isViewer) return;
        let msg: any;
        try { msg = JSON.parse(String(raw)); } catch { return; }
        if (!msg) return;

	// ADD - for treating the ready check. playerRead then starts the game if they all re ready
	if (msg.type === 'ready') {
        	game.playerReady(playerId);
        	return;
	}

	if (typeof msg.seq !== 'number') return;
        if (pSock.lastSeq && msg.seq <= (pSock.lastSeq)) return;
        pSock.lastSeq = msg.seq;
        msg.t ||= Date.now();
        game.playerInput(playerId, msg as PlayerInput);
      });

      ws.on('close', () => {
        game.removePlayer(playerId);
      });
  });
});

fastify.listen({ host: "0.0.0.0", port: config.PORT })
  .then(() => fastify.log.info(`Listening on 0.0.0.0:${config.PORT}`));

const shutdown = async () => {
  fastify.log.info('Shutting down game service');

  for (const game of games.values()) {
    if (game.loop) {
      clearInterval(game.loop);
      game.loop = undefined;
    }
    // clean shut of sockets
    for (const player of game.players.values()) {
	    player.ws.close(1001, 'Game Server shutting down');
    }
  }

  try {
    await fastify.close();
  } catch (err) {
    fastify.log.error(err, 'Error closing Fastify:');
  }

  fastify.log.info('Game service stopped.');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

