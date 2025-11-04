import { FastifyInstance } from 'fastify';
import { getPlayerGamesSchema, getPlayerStatsSchema, getGameByIdSchema, getPlayerTournamentsSchema, getTournamentByIdSchema} from './game-history.schemas';
import { UserId, GameId, TournamentId } from '../types';
import { UnauthorizedError } from '../utils/errors';

//TODO: proper auth prehandler
export default async function gameHistoryRoutes(fastify: FastifyInstance) {

	fastify.get('/user/stats', async (request) => {
		const userId = Number(request.headers['x-user-id']);
		if (!userId) {
			throw new UnauthorizedError('Unauthorized');
		}
		return fastify.gameHistory.getPlayerStats(userId);
	});
	fastify.get<{
		Querystring: { page?: number; per_page?: number };
	}>('/user/games', async (request) => {
		const userId = Number(request.headers['x-user-id']);
		if (!userId) {
			throw new UnauthorizedError('Unauthorized');
		}
		const page = request.query.page ?? 1;
		const perPage = request.query.per_page ?? 25;
		return fastify.gameHistory.getPlayerGames(userId, page, perPage);
	});

	fastify.get<{
		Querystring: { page?: number; per_page?: number };
	}>('/user/tournaments', async (request) => {
		const userId = Number(request.headers['x-user-id']);
		if (!userId) {
			throw new UnauthorizedError('Unauthorized');
		}
		const page = request.query.page ?? 1;
		const perPage = request.query.per_page ?? 20;
		return fastify.gameHistory.getPlayerTournaments(userId, page, perPage);
	});

	fastify.get<{
		Params: { userId: string };
	}>('/users/:userId/stats', {
		schema: getPlayerStatsSchema
	}, async (request) => {
		const userId = Number(request.params.userId);
		return fastify.gameHistory.getPlayerStats(userId);
	});

	fastify.get<{
		Params: { userId: string };
		Querystring: { page?: number; per_page?: number };
	}>('/users/:userId/games', {
		schema: getPlayerGamesSchema
	}, async (request) => {
		const userId = Number(request.params.userId);
		const page = request.query.page ?? 1;
		const perPage = request.query.per_page ?? 25;

		return fastify.gameHistory.getPlayerGames(userId, page, perPage);
	});

	fastify.get<{
		Params: { userId: string };
		Querystring: { page?: number; per_page?: number };
	}>('/users/:userId/tournaments', {
		schema: getPlayerTournamentsSchema
	}, async (request) => {
		const userId = Number(request.params.userId);
		const page = request.query.page ?? 1;
		const perPage = request.query.per_page ?? 20;

		return fastify.gameHistory.getPlayerTournaments(userId, page, perPage);
	});

	fastify.get<{
		Params: { gameId: string };
	}>('/games/:gameId', {
		schema: getGameByIdSchema
	}, async (request) => {
		return fastify.gameHistory.getGameById(request.params.gameId);
	});

	fastify.get<{
		Params: { tournamentId: string };
	}>('/tournaments/:tournamentId', {
		schema: getTournamentByIdSchema
	}, async (request) => {
		return fastify.gameHistory.getTournamentById(request.params.tournamentId);
	});
}
