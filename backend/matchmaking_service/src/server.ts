import Fastify from 'fastify';
import { config } from './config/config';
import { AppError } from './utils/errors'
import dbPlugin from './database/database';
import gameServicePlugin from './clients/game-service.plugin';
import gameRegistryPlugin from './managers/GameRegistry.plugin';
import gameHistoryManagerPlugin from './managers/GameHistoryManager.plugin';
import customGameManagerPlugin from './managers/CustomGameManager.plugin';
import queueManagerPlugin from './managers/QueueManager.plugin';
import tournamentManagerPlugin from './managers/TournamentManager.plugin';
import eventManagerPlugin from './managers/EventManager.plugin';
import webhooksRoutes from './routes/webhooks/game-service.routes';
import customGamesRoutes from './routes/custom-games.routes';
import queueRoutes from './routes/queue.routes';
import gameHistoryRoutes from './routes/game-history.routes';
import eventsRoutes from './routes/events.routes';
import tournamentRoutes from './routes/tournament.routes';
import localGamesRoutes from './routes/local-games.routes';


const envToLogger = {
  development: {
    level: process.env.LOG_LEVEL || 'debug',
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
    level: process.env.LOG_LEVEL || 'warn'
  },
  test: false
};

const environment = process.env.NODE_ENV || 'development';
const fastify = Fastify({
  logger: envToLogger[environment] ?? true
});

fastify.setErrorHandler((error, request, reply) => {

  // business logic errors
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.message
    });
  }

  // fastify schema validation errors
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation error',
      details: error.validation
    });
  }

  // other non-server errors
  if (error.statusCode && error.statusCode < 500) {
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
