import { FastifyInstance } from 'fastify';
import { GameResultWebhook, UserId } from '../../types.js';
import { gameResultWebhookSchema, gameAbandonedWebhookSchema } from './game-service.schemas.js';

export default async function webhooksRoutes(fastify: FastifyInstance) {
	fastify.post<{
		Params: { gameId: string };
		Body: Omit<GameResultWebhook, 'id'>;
	}>('/webhooks/games/:gameId/result', {
		schema: gameResultWebhookSchema
	}, async (req) => {
		const gameId = req.params.gameId;
		const gameResult: GameResultWebhook = {
			id: gameId,
			players: req.body.players,
			winnerId: req.body.winnerId,
			date: req.body.date,
			duration: req.body.duration,
		};

		const gameEntry = fastify.gameRegistry.get(gameId);
		if (!gameEntry) {
			fastify.log.warn({ gameId }, 'Received result for unregistered game');
			return { message: 'Game not found.' };
		}

		try {
			switch (gameEntry.type) {
				case 'custom':
					fastify.customGameManager.handleGameComplete(gameResult);
					break;
				case 'queue':
					fastify.queueManager.handleGameComplete(gameResult);
					break;
				case 'tournament':
					fastify.tournamentManager.handleGameComplete(gameResult);
					break;
			}

			return { message: 'Game result processed successfully' };
		} catch (error) {
			fastify.log.error({ gameId, error }, 'Failed to process game result');
			return { message: 'Failed to process game result' };
		}
	});

	fastify.post<{
		Params: { gameId: string };
		Body: {
			connectedPlayers?: UserId[];
			date?: string;
		};
	}>('/webhooks/games/:gameId/abandoned', {
		schema: gameAbandonedWebhookSchema
	}, async (req) => {
		const { gameId } = req.params;
		const { connectedPlayers = [], date = new Date().toISOString() } = req.body;

		const gameEntry = fastify.gameRegistry.get(gameId);
		if (!gameEntry) {
			fastify.log.warn({ gameId }, 'Received abandoned for unregistered game');
			return { message: 'Game not found.' };
		}

		try {
			if (gameEntry.type === 'tournament') {
				fastify.tournamentManager.handleGameAbandonment(gameId, connectedPlayers, date);
			}
			return { message: 'Abandoned game processed' };
		} catch (error) {
			fastify.log.error({ gameId, error }, 'Failed to process abandoned tournament game');
			return { message: 'Failed to process abandoned tournament game' };
		}
	});

}
