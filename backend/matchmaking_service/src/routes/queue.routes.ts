import { FastifyInstance } from 'fastify';
import { joinQueueSchema } from './queue.schemas.js';
import { UnauthorizedError, ConflictError } from '../utils/errors.js';

export default async function queueRoutes(fastify: FastifyInstance) {

	fastify.post('/queue/join', {
		schema: joinQueueSchema
	}, async (request) => {
		const userId = Number(request.headers['x-user-id']);
		if (!userId) {
			throw new UnauthorizedError();
		}
		const gameKey = await fastify.queueManager.joinQueue(userId);
		return gameKey;
	});

	fastify.delete('/queue/leave', async (request) => {
		const userId = Number(request.headers['x-user-id']);
		if (!userId) {
			throw new UnauthorizedError();
		}
		const left = fastify.queueManager.leaveQueue(userId);
		if (!left) {
			throw new ConflictError('You are not in the queue');
		}
	});
}
