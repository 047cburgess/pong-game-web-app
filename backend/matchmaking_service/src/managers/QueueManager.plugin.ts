import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { QueueManager } from './QueueManager.js';

declare module 'fastify' {
	interface FastifyInstance {
		queueManager: QueueManager;
	}
}

export default fp(async function(fastify: FastifyInstance) {
	const queueManager = new QueueManager(
		fastify.log,
		fastify.gameClient,
		fastify.gameRegistry,
		fastify.db
	);

	fastify.decorate('queueManager', queueManager);
	fastify.log.info('QueueManager initialized');
}, { dependencies: ['database', 'gameClient', 'gameRegistry'] });
