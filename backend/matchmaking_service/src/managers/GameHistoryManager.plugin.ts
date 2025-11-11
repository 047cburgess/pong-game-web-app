import fp from 'fastify-plugin';
import { GameHistoryManager } from './GameHistoryManager.js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		gameHistory: GameHistoryManager;
	}
}

async function gameHistoryManagerPlugin(fastify: FastifyInstance) {
	const manager = new GameHistoryManager(fastify.db, fastify.log);
	fastify.decorate('gameHistory', manager);
	fastify.log.info('GameHistoryManager initialized');
}

export default fp(gameHistoryManagerPlugin, {
	name: 'gameHistoryManager',
	dependencies: ['database']
});
