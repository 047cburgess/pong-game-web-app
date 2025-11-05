import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ConflictError, ForbiddenError, BadRequestError } from '../utils/errors';
import { LocalGameSubmission, LocalTournamentSubmission, LocalGameDB, LocalGameParticipantDB, LocalTournamentDB, UserId } from '../types';
import { randomUUID } from 'crypto';

function processLocalGame( gameSubmission: LocalGameSubmission, hostId: UserId): { gameDB: LocalGameDB; participants: LocalGameParticipantDB[] } {

	const hostPlayer = gameSubmission.players.find(p => typeof p.id === 'number');
	const guestPlayers = gameSubmission.players.filter(p => typeof p.id === 'string');

	if (hostPlayer && hostPlayer.id !== hostId) {
		throw new ForbiddenError('Player ID does not match authenticated user');
	}

	let winnerType: 'host' | 'guest' | null = null;
	let winnerGuestName: string | undefined = undefined;

	if (gameSubmission.winnerId !== undefined) {
		if (typeof gameSubmission.winnerId === 'number') {
			if (gameSubmission.winnerId === hostId) {
				winnerType = 'host';
			}
		} else {
			winnerType = 'guest';
			winnerGuestName = gameSubmission.winnerId;
		}
	}

	const participants: LocalGameParticipantDB[] = [];

	if (hostPlayer) {
		participants.push({
			position: 1,
			guestName: undefined,
			score: hostPlayer.score
		});
	}

	// flatten it out
	const startPosition = hostPlayer ? 2 : 1;
	participants.push(
		...guestPlayers.map((guest, idx) => ({
			position: startPosition + idx,
			guestName: guest.id as string,
			score: guest.score
		}))
	);

	const gameDB: LocalGameDB = {
		id: gameSubmission.gameId,
		hostId: hostId,
		date: new Date(),
		duration: gameSubmission.duration,
		winnerType,
		winnerGuestName
	};

	return { gameDB, participants };
}

export async function handleLocalGameSubmission(
	fastify: FastifyInstance,
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	const hostId = Number(request.headers['x-user-id']);
	if (!hostId) {
		throw new UnauthorizedError();
	}

	const submission = request.body as LocalGameSubmission;

	try {
		const { gameDB, participants } = processLocalGame(submission, hostId);
		fastify.db.saveLocalGame(gameDB, participants);
		fastify.log.info({ gameId: gameDB.id, hostId }, 'Local game saved successfully');

		reply.code(204).send();
	} catch (error) {
		if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
			throw new ConflictError('Game ID already exists');
		}
		fastify.log.error({ error, hostId }, 'Failed to save local game');
		throw error;
	}
}

export async function handleLocalTournamentSubmission(
	fastify: FastifyInstance,
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	const hostId = Number(request.headers['x-user-id']);
	if (!hostId) {
		throw new UnauthorizedError();
	}

	const submission = request.body as LocalTournamentSubmission;

	try {
		const hostParticipant = submission.participants.find(p => typeof p.id === 'number');
		const guestParticipants = submission.participants.filter(p => typeof p.id === 'string');

		if (!hostParticipant || typeof hostParticipant.id !== 'number') {
			throw new BadRequestError('No host participant found (numeric ID)');
		}

		if (hostParticipant.id !== hostId) {
			throw new ForbiddenError('Host participant ID does not match authenticated user');
		}

		if (guestParticipants.length !== 3) {
			throw new BadRequestError('Local tournament must have exactly 3 guests');
		}

		const semi1 = processLocalGame(submission.games.semifinal1, hostId);
		const semi2 = processLocalGame(submission.games.semifinal2, hostId);
		const final = processLocalGame(submission.games.final, hostId);

		fastify.db.saveLocalGame(semi1.gameDB, semi1.participants);
		fastify.db.saveLocalGame(semi2.gameDB, semi2.participants);
		fastify.db.saveLocalGame(final.gameDB, final.participants);

		const finalWinnerType = final.gameDB.winnerType;
		const finalWinnerGuestName = final.gameDB.winnerGuestName;

		if (!finalWinnerType) {
			throw new BadRequestError('Tournament final must have a winner (no draws)');
		}

		const tournamentId = randomUUID();

		const tournamentDB: LocalTournamentDB = {
			id: tournamentId,
			hostId: hostId,
			guest1Name: guestParticipants[0].id as string,
			guest2Name: guestParticipants[1].id as string,
			guest3Name: guestParticipants[2].id as string,
			semi1Id: semi1.gameDB.id,
			semi2Id: semi2.gameDB.id,
			finalId: final.gameDB.id,
			winnerType: finalWinnerType,
			winnerName: finalWinnerType === 'host' ? 'host' : finalWinnerGuestName!,
			date: new Date()
		};

		fastify.db.saveLocalTournament(tournamentDB);
		fastify.log.info({ tournamentId, hostId }, 'Local tournament saved successfully');

		reply.code(204).send();
	} catch (error) {
		if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
			throw new ConflictError('Game ID already exists');
		}
		fastify.log.error({ error, hostId }, 'Failed to save local tournament');
		throw error;
	}
}
