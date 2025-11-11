import fp from 'fastify-plugin';
import { GameRegistry } from './GameRegistry.js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		gameRegistry: GameRegistry;
	}
}

async function gameRegistryPlugin(fastify: FastifyInstance) {
	const registry = new GameRegistry(fastify.log);
	fastify.decorate('gameRegistry', registry);
	fastify.log.info('GameRegistry initialized');
}

export default fp(gameRegistryPlugin, { name: 'gameRegistry' });
