import fp from 'fastify-plugin';
import { TournamentManager } from './TournamentManager.js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		tournamentManager: TournamentManager;
	}
}

async function tournamentManagerPlugin(fastify: FastifyInstance) {
	const manager = new TournamentManager(
		fastify.gameClient,
		fastify.log,
		fastify.eventManager,
		fastify.gameRegistry,
		fastify.db
	);
	fastify.decorate('tournamentManager', manager);
	fastify.log.info('TournamentManager initialized');
}

export default fp(tournamentManagerPlugin, {
	name: 'tournamentManager',
	dependencies: ['gameClient', 'eventManager', 'gameRegistry', 'database']
});
