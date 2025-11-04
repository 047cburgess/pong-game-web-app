import { FastifyInstance } from 'fastify';
import {
	createTournamentSchema,
	inviteTournamentSchema,
	joinTournamentSchema,
	declineTournamentSchema,
	getTournamentStatusSchema
} from './tournament.schemas';
import { UnauthorizedError } from '../utils/errors';
import { UserId } from '../types';

export default async function tournamentRoutes(fastify: FastifyInstance) {

	// POST /tournaments/create - Create a new tournament
	fastify.post('/tournaments/create', {
		schema: createTournamentSchema
	}, async (request) => {
		const hostId = Number(request.headers['x-user-id']);
		if (!hostId)
			throw new UnauthorizedError();

		const { invitedPlayerIds } = request.body as { invitedPlayerIds?: UserId[] };
		const response = await fastify.tournamentManager.createTournament(hostId, invitedPlayerIds);
		return response;
	});

	// POST /tournaments/:tournamentId/invite - Invite additional players to tournament
	fastify.post<{ Params: { tournamentId: string } }>('/tournaments/:tournamentId/invite', {
		schema: inviteTournamentSchema
	}, async (request) => {
		const hostId = Number(request.headers['x-user-id']);
		if (!hostId)
			throw new UnauthorizedError();

		const tournamentId = request.params.tournamentId;
		const { invitedPlayerIds } = request.body as { invitedPlayerIds: UserId[] };
		const response = await fastify.tournamentManager.invitePlayer(tournamentId, hostId, invitedPlayerIds);
		return response;
	});

	// POST /tournaments/:tournamentId/join - Accept tournament invite
	fastify.post<{ Params: { tournamentId: string } }>('/tournaments/:tournamentId/join', {
		schema: joinTournamentSchema
	}, async (request) => {
		const playerId = Number(request.headers['x-user-id']);
		if (!playerId) {
			throw new UnauthorizedError();
		}
		const tournamentId = request.params.tournamentId;
		const response = fastify.tournamentManager.acceptInvite(tournamentId, playerId);
		return response;
	});

	// DELETE /tournaments/:tournamentId/decline - Decline tournament invite
	fastify.delete<{ Params: { tournamentId: string } }>('/tournaments/:tournamentId/decline', {
		schema: declineTournamentSchema
	}, async (request, reply) => {
		const playerId = Number(request.headers['x-user-id']);
		if (!playerId)
			throw new UnauthorizedError();

		const tournamentId = request.params.tournamentId;
		fastify.tournamentManager.declineInvite(tournamentId, playerId);
		return reply.code(204).send();
	});

	// GET /tournaments/:tournamentId/status - Get tournament status (for polling)
	fastify.get<{ Params: { tournamentId: string } }>('/tournaments/:tournamentId/status', {
		schema: getTournamentStatusSchema
	}, async (request) => {
		const playerId = Number(request.headers['x-user-id']);
		if (!playerId)
			throw new UnauthorizedError();

		const tournamentId = request.params.tournamentId;
		const status = fastify.tournamentManager.getStatus(tournamentId, playerId);
		return status;
	});
}
