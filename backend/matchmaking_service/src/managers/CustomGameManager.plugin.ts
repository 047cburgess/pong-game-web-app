import fp from 'fastify-plugin';
import { CustomGameManager } from './CustomGameManager.js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		customGameManager: CustomGameManager;
	}
}

async function customGameManagerPlugin(fastify: FastifyInstance) {
	const manager = new CustomGameManager(
		fastify.gameClient,
		fastify.log,
		fastify.eventManager,
		fastify.gameRegistry,
		fastify.db
	);
	fastify.decorate('customGameManager', manager);
	fastify.log.info('CustomGameManager initialized');
}

export default fp(customGameManagerPlugin, {name: 'customGameManager', dependencies: ['gameClient', 'eventManager', 'gameRegistry', 'database']});
