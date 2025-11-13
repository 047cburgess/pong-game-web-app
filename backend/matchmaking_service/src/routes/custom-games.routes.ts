import { FastifyInstance } from 'fastify';
import { createCustomGameSchema, joinGameSchema, declineGameSchema, viewGameSchema, inviteGameSchema } from './custom-games.schemas.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { UserId, InviteToGameRequest } from '../types.js';
// TODO: Authentication -> should be a prehandler rather than being mixed in. Here temp.

 	export default async function customGamesRoutes(fastify: FastifyInstance) {
	// POST /games/create - Create custom game
	fastify.post('/games/create', {
		schema: createCustomGameSchema
	}, async (request) => {
		const hostId = Number(request.headers['x-user-id']);
		if (!hostId) {
			throw new UnauthorizedError();
		}
		const { numberOfPlayers, invitedPlayerIds } = request.body as {
			numberOfPlayers: number;
			invitedPlayerIds: UserId[];
		};
		const hostKey = await fastify.customGameManager.createGame(
			hostId,
			invitedPlayerIds,
			numberOfPlayers
		);
		return hostKey;
	});
	
	// POST /games/{gameId}/invite - Invite additional players to game
	fastify.post<{ Params: { gameId: string }; Body: InviteToGameRequest }>('/games/:gameId/invite', {
		schema: inviteGameSchema
	}, async (request) => {
		const hostId = Number(request.headers['x-user-id']);
		if (!hostId)
			throw new UnauthorizedError();

		const { gameId, invitedPlayerIds } = request.body;
		const response = fastify.customGameManager.invitePlayers(gameId, hostId, invitedPlayerIds);
		return response;
	});

	// POST /games/{gameId}/join - Join game (custom or tournament)
	fastify.post<{ Params: { gameId: string } }>('/games/:gameId/join', {
		schema: joinGameSchema
	}, async (request) => {
		const playerId = Number(request.headers['x-user-id']);
		if (!playerId) {
			throw new UnauthorizedError();
		}
		const gameId = request.params.gameId;

		// Check game type from registry
		const gameEntry = fastify.gameRegistry.get(gameId);
		if (!gameEntry) {
			throw new NotFoundError('Game not found');
		}

		// Route to appropriate manager
		if (gameEntry.type === 'custom') {
			const playerKey = fastify.customGameManager.acceptInvite(gameId, playerId);
			return playerKey;
		} else if (gameEntry.type === 'tournament') {
			const playerKey = fastify.tournamentManager.joinGame(gameId, playerId);
			return playerKey;
		} else {
			// 'queue' type - should not be joined via this endpoint
			throw new NotFoundError('Game not found');
		}
	});

	// DELETE /games/{gameId}/decline - Decline game invite (custom only)
	fastify.delete<{ Params: { gameId: string } }>('/games/:gameId/decline', {
		schema: declineGameSchema
	}, async (request, reply) => {
		const playerId = Number(request.headers['x-user-id']);
		if (!playerId) {
			throw new UnauthorizedError();
		}
		const gameId = request.params.gameId;

		const gameEntry = fastify.gameRegistry.get(gameId);
		if (!gameEntry || gameEntry.type !== 'custom') {
			throw new NotFoundError('Game not found');
		}

		fastify.customGameManager.declineInvite(gameId, playerId);
		return reply.code(204).send();
	});

	// POST /games/{gameId}/view - Get viewing key (tournament only)
	fastify.post<{ Params: { gameId: string } }>('/games/:gameId/view', {
		schema: viewGameSchema
	}, async (request) => {
		const viewerId = Number(request.headers['x-user-id']);
		if (!viewerId) {
			throw new UnauthorizedError();
		}
		const gameId = request.params.gameId;

		// Only tournament games support viewing
		const gameEntry = fastify.gameRegistry.get(gameId);
		if (!gameEntry || gameEntry.type !== 'tournament') {
			throw new NotFoundError('Game not found or does not support viewing');
		}

		const viewingInfo = fastify.tournamentManager.viewGame(gameId, viewerId);
		return viewingInfo;
	});
}
