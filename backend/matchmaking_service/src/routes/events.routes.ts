import { FastifyInstance } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';

export default async function eventsRoutes(fastify: FastifyInstance) {

	fastify.get('/events', async (request, reply) => {

		const query = request.query as { user_id?: string };
		fastify.log.debug(`EVENTS: user_id: ${query.user_id}`);
		const userId = Number(request.headers['x-user-id'] || query.user_id);
		if (!userId) {
			throw new UnauthorizedError('Unauthorized');
		}

		reply.raw.setHeader('Content-Type', 'text/event-stream');
		reply.raw.setHeader('Connection', 'keep-alive');
		reply.raw.setHeader('Access-Control-Allow-Origin', '*');
		reply.raw.write(':ping\n\n');

		fastify.eventManager.addConnection(userId, reply);

		fastify.log.info({ userId }, 'SSE connection established');

		const heartbeat = setInterval(() => {
			try {
				reply.raw.write(':ping\n\n');
			} catch (err) {
				fastify.eventManager.removeConnection(userId);
			}
		}, 30000);

		// Register heartbeat with EventManager for cleanup on shutdown
		fastify.eventManager.addHeartbeat(userId, heartbeat);

		// Clean closes from client
		request.raw.on('close', () => {
			fastify.eventManager.removeConnection(userId);
			fastify.log.info({ userId }, 'SSE connection closed');
		});
	});
}
