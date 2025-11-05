import { FastifyInstance } from 'fastify';
import { submitLocalGameSchema, submitLocalTournamentSchema } from './local-games.schemas';
import { handleLocalGameSubmission, handleLocalTournamentSubmission } from './local-games.handlers';

export default async function localGamesRoutes(fastify: FastifyInstance) {

	// POST /games/local - Submit local game result
	fastify.post('/games/local', {
		schema: submitLocalGameSchema
	}, async (request, reply) => {
		await handleLocalGameSubmission(fastify, request, reply);
	});

	// POST /tournaments/local - Submit local tournament result
	fastify.post('/tournaments/local', {
		schema: submitLocalTournamentSchema
	}, async (request, reply) => {
		await handleLocalTournamentSubmission(fastify, request, reply);
	});
}
