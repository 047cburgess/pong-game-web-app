import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/config.js';
import { AppError } from './utils/errors.js'
import dbPlugin from './database/database.js';
import gameServicePlugin from './clients/game-service.plugin.js';
import gameRegistryPlugin from './managers/GameRegistry.plugin.js';
import gameHistoryManagerPlugin from './managers/GameHistoryManager.plugin.js';
import customGameManagerPlugin from './managers/CustomGameManager.plugin.js';
import queueManagerPlugin from './managers/QueueManager.plugin.js';
import tournamentManagerPlugin from './managers/TournamentManager.plugin.js';
import eventManagerPlugin from './managers/EventManager.plugin.js';
import webhooksRoutes from './routes/webhooks/game-service.routes.js';
import customGamesRoutes from './routes/custom-games.routes.js';
import queueRoutes from './routes/queue.routes.js';
import gameHistoryRoutes from './routes/game-history.routes.js';
import eventsRoutes from './routes/events.routes.js';
import tournamentRoutes from './routes/tournament.routes.js';
import localGamesRoutes from './routes/local-games.routes.js';


const envToLogger = {
  development: {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
    	translateTime: "SYS:HH:MM:ss Z",
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

const fastify = Fastify({
  logger: envToLogger[config.NODE_ENV as keyof typeof envToLogger] ?? true
});

await fastify.register(cors, {
	origin: (_origin, cb) => {
		cb(null, true);
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
});

fastify.setErrorHandler((error, _request, reply) => {

  // business logic errors
  if (error instanceof AppError) {
  	fastify.log.error(error);
    return reply.code(error.statusCode).send({
      error: error.message
    });
  }

  // fastify schema validation errors
  if (error.validation) {
  	fastify.log.error(error);
    return reply.code(400).send({
      error: 'Validation error',
      details: error.validation
    });
  }

  // other non-server errors
  if (error.statusCode && error.statusCode < 500) {
  	fastify.log.error(error);
    return reply.code(error.statusCode).send({
      error: error.message
    });
  }

  fastify.log.error(error);

  // unexpected server errors
  return reply.code(500).send({error: 'Internal server error'});
});



// REGISTER ALL THE ROUTES & plugins
fastify.register(dbPlugin);
fastify.register(gameServicePlugin);
fastify.register(gameRegistryPlugin);
fastify.register(gameHistoryManagerPlugin);
fastify.register(eventManagerPlugin);
fastify.register(customGameManagerPlugin);
fastify.register(queueManagerPlugin);
fastify.register(tournamentManagerPlugin);
fastify.register(webhooksRoutes);
fastify.register(customGamesRoutes);
fastify.register(queueRoutes);
fastify.register(gameHistoryRoutes);
fastify.register(eventsRoutes);
fastify.register(tournamentRoutes);
fastify.register(localGamesRoutes);


fastify.listen({ port: config.PORT, host: '0.0.0.0'}, (err, address) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	fastify.log.info(`Matchmaking service running on ${address}`);
});

// cleanup job for abandoned games
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const PENDING_GAME_MAX_AGE_MS = 60 * 60 * 1000;
const ACTIVE_GAME_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const QUEUE_WAITING_MAX_AGE_MS = 10 * 60 * 1000;
const TOURNAMENT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

let cleanupIntervalId: NodeJS.Timeout;

fastify.ready().then(() => {
  fastify.log.info('Starting periodic cleanup job');

  cleanupIntervalId = setInterval(() => {
    fastify.log.debug('Running periodic cleanup');

    try {
      const customCleaned = fastify.customGameManager.cleanupAbandonedGames(
	      PENDING_GAME_MAX_AGE_MS);

      const queueCleaned = fastify.queueManager.cleanupAbandonedGames(
        QUEUE_WAITING_MAX_AGE_MS,
        ACTIVE_GAME_MAX_AGE_MS
      );

      const tournamentCleaned = fastify.tournamentManager.cleanupAbandonedTournaments(
	      TOURNAMENT_MAX_AGE_MS);

      const registryStats = fastify.gameRegistry.getStats();

      if (customCleaned > 0 || queueCleaned.waiting > 0 || queueCleaned.active > 0 ||
          tournamentCleaned > 0) {
        fastify.log.info(
          {
            cleaned: {
              custom: customCleaned,
              queueWaiting: queueCleaned.waiting,
              queueActive: queueCleaned.active,
              tournaments: tournamentCleaned
            },
            registry: registryStats
          },
          'Cleanup completed'
        );
      } else {
        fastify.log.debug({ registry: registryStats }, 'Cleanup cycle - no games to clean');
      }
    } catch (error) {
      fastify.log.error(error, 'Error during cleanup');
    }
  }, CLEANUP_INTERVAL_MS);
});

const shutdown = async () => {
  fastify.log.info('Shutting down matchmaking service');

  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    fastify.log.info('Cleanup interval cleared');
  }

  // Cancel all tournament cleanup timeouts
  fastify.tournamentManager.cancelAllCleanupTimeouts();

  // Close all SSE connections
  fastify.eventManager.closeAllConnections();

  try {
    await fastify.close();
  } catch (err) {
    fastify.log.error(err, 'Error closing Fastify:');
  }

  fastify.log.info('Matchmaking service stopped.');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
