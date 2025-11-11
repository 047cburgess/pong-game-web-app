import { FastifyInstance } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';
import { submitLocalGameSchema, submitLocalTournamentSchema } from './local-games.schemas.js';
import { LocalGameSubmission, LocalTournamentSubmission } from '../types.js';

export default async function localGamesRoutes(fastify: FastifyInstance) {

	// POST /games/local - Submit local game result
	fastify.post('/user/games/local', {
		schema: submitLocalGameSchema
	}, (request, reply) => {
		const hostId = Number(request.headers['x-user-id']);
		if (!hostId) {
			throw new UnauthorizedError();
		}
		const submission = request.body as LocalGameSubmission;
		fastify.gameHistory.saveLocalGame(submission, hostId);
		return reply.code(204).send();
	});

	// POST /tournaments/local - Submit local tournament result
	fastify.post('/user/tournaments/local', {
		schema: submitLocalTournamentSchema
	}, (request, reply) => {
		const hostId = Number(request.headers['x-user-id']);
		if (!hostId) {
			throw new UnauthorizedError();
		}

		const submission = request.body as LocalTournamentSubmission;
		fastify.gameHistory.saveLocalTournament(submission, hostId);
		return reply.code(204).send();
	});

	// GET /user/games/local - Get local games for a player
	fastify.get<{
		Querystring: { page?: string; perPage?: string };
	}>('/user/games/local', (request, reply) => {
		const hostId = Number(request.headers['x-user-id']);
		if (!hostId) {
			throw new UnauthorizedError();
		}

		const page = request.query.page ? parseInt(request.query.page, 10) : 1;
		const perPage = request.query.perPage ? parseInt(request.query.perPage, 10) : 25;

		const games = fastify.gameHistory.getLocalGamesByPlayer(hostId, page, perPage);
		return reply.code(200).send({ games });
	});

	// GET /user/tournaments/local - Get local tournaments for a player
	fastify.get<{
		Querystring: { page?: string; perPage?: string };
	}>('/user/tournaments/local', (request, reply) => {
		const hostId = Number(request.headers['x-user-id']);
		if (!hostId) {
			throw new UnauthorizedError();
		}

		const page = request.query.page ? parseInt(request.query.page, 10) : 1;
		const perPage = request.query.perPage ? parseInt(request.query.perPage, 10) : 20;

		const tournaments = fastify.gameHistory.getLocalTournamentsByPlayer(hostId, page, perPage);
		return reply.code(200).send({ tournaments });
	});
}
