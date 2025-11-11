import fp from 'fastify-plugin';
import { EventManager } from './EventManager.js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		eventManager: EventManager;
	}
}

async function eventManagerPlugin(fastify: FastifyInstance) {
	const eventManager = new EventManager(fastify.log);
	fastify.decorate('eventManager', eventManager);
	fastify.log.info('EventManager initialized');
}

export default fp(eventManagerPlugin, {name: 'eventManager'});
