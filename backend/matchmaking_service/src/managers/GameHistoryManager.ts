import type { FastifyInstance, FastifyBaseLogger } from 'fastify';
import { UserId, GameId, TournamentId, GameResultAPI, TournamentResultAPI, GameStatsAPI, DailyPlayerStatsAPI } from '../types.js';
import { LocalGameSubmission, LocalTournamentSubmission, LocalGameDB, LocalGameParticipantDB, LocalTournamentDB } from '../types.js';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../utils/errors.js';
import { randomUUID } from 'crypto';

export class GameHistoryManager {
	private log: FastifyBaseLogger;
	private db: FastifyInstance['db'];

	constructor(db: FastifyInstance['db'], logger: FastifyBaseLogger) {
		this.log = logger;
		this.db = db;
	}

	private transformGameRow(row: any): GameResultAPI {
		const players = JSON.parse(row.players);
		return {
			id: row.game_id,
			players: players.map((p: any) => ({
				id: p.id,
				score: p.score,
			})),
			winnerId: row.winner_id,
			tournamentId: row.tournament_id,
			date: row.date,
			duration: row.duration,
		};
	}

	private transformTournamentRow(row: any): TournamentResultAPI {
		const semi1 = this.db.getGameById(row.semi1_id);
		const semi2 = this.db.getGameById(row.semi2_id);
		const final = this.db.getGameById(row.final_id);

		if (!semi1 || !semi2 || !final) {
			this.log.error({ tournamentId: row.tournament_id }, 'Tournament missing game data');
			throw new Error('Tournament data incomplete');
		}

		return {
			id: row.tournament_id,
			date: row.date,
			participants: JSON.parse(row.participants).map((p: any) => ({ id: p.id })),
			games: {
				semifinal1: this.transformGameRow(semi1),
				semifinal2: this.transformGameRow(semi2),
				final: this.transformGameRow(final),
			},
		};
	}

	private transformLocalGameRow(row: any): any {
		const participants = JSON.parse(row.participants);
		return {
			id: row.game_id,
			hostId: row.host_id,
			date: row.date,
			duration: row.duration,
			winnerType: row.winner_type,
			winnerGuestName: row.winner_guest_name,
			participants: participants.map((p: any) => ({
				position: p.position,
				guestName: p.guestName,
				score: p.score,
			})),
		};
	}

	private transformLocalTournamentRow(row: any): any {
		return {
			id: row.tournament_id,
			hostId: row.host_id,
			date: row.date,
			guest1Name: row.guest1_name,
			guest2Name: row.guest2_name,
			guest3Name: row.guest3_name,
			semi1Id: row.semi1_id,
			semi2Id: row.semi2_id,
			finalId: row.final_id,
			winnerType: row.winner_type,
			winnerName: row.winner_name,
		};
	}

	/**
	 * Process a local game submission into database format
	 * No validation - just transforms data
	 */
	private processLocalGame(gameSubmission: LocalGameSubmission, hostId: UserId): { game: LocalGameDB; participants: LocalGameParticipantDB[] } {
		const { gameId, players, winnerId, duration } = gameSubmission;

		let winnerType: 'host' | 'guest' | null = null;
		let winnerGuestName: string | undefined = undefined;

		if (winnerId !== undefined && winnerId !== null) {
			if (typeof winnerId === 'number') {
				winnerType = winnerId === hostId ? 'host' : null;
			} else {
				winnerType = 'guest';
				winnerGuestName = winnerId as string;
			}
		}

		// Map players to participants (position-based)
		const participants: LocalGameParticipantDB[] = players.map((p, i) => ({
			position: i + 1,
			guestName: typeof p.id === 'string' ? (p.id as string) : undefined,
			score: p.score,
		}));

		const game: LocalGameDB = {
			id: gameId,
			hostId,
			date: new Date(),
			duration,
			winnerType,
			winnerGuestName,
		};

		return { game, participants };
	}

	saveLocalGame(submission: LocalGameSubmission, hostId: UserId): void {
		this.log.info({ gameId: submission.gameId, hostId, playerCount: submission.players.length }, 'Processing local game submission');

		// Validate: host must be a player in standalone local games
		const hostPlayer = submission.players.find(p => typeof p.id === 'number');
		if (!hostPlayer || hostPlayer.id !== hostId) {
			throw new ForbiddenError('Host must be a player in local games');
		}

		const { game, participants } = this.processLocalGame(submission, hostId);

		try {
			this.db.saveLocalGame(game, participants);
			this.log.info({ gameId: game.id, hostId, winnerType: game.winnerType }, 'Local game saved successfully');
		} catch (error: any) {
			if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
				throw new ConflictError('Game ID already exists');
			}
			this.log.error({ error, gameId: game.id, hostId }, 'Failed to save local game');
			throw error;
		}
	}

	saveLocalTournament(submission: LocalTournamentSubmission, hostId: UserId): void {
		this.log.info({ hostId, participantCount: submission.participants.length }, 'Processing local tournament submission');

		// Validate host and guests
		const hostParticipant = submission.participants.find(p => typeof p.id === 'number');
		const guestParticipants = submission.participants.filter(p => typeof p.id === 'string');

		if (!hostParticipant || hostParticipant.id !== hostId) {
			throw new ForbiddenError('Host participant ID does not match authenticated user');
		}

		if (guestParticipants.length !== 3) {
			throw new BadRequestError('Local tournament must have exactly 3 guests');
		}

		// Process all 3 games
		this.log.debug({ hostId, guests: guestParticipants.map(g => g.id) }, 'Processing tournament games');
		const semi1 = this.processLocalGame(submission.games.semifinal1, hostId);
		const semi2 = this.processLocalGame(submission.games.semifinal2, hostId);
		const final = this.processLocalGame(submission.games.final, hostId);

		if (!final.game.winnerType) {
			throw new BadRequestError('Tournament final must have a winner (no draws)');
		}

		try {
			// Save all 3 games
			this.log.debug({ semi1Id: semi1.game.id, semi2Id: semi2.game.id, finalId: final.game.id }, 'Saving tournament games');
			this.db.saveLocalGame(semi1.game, semi1.participants);
			this.db.saveLocalGame(semi2.game, semi2.participants);
			this.db.saveLocalGame(final.game, final.participants);

			// Build tournament record
			const tournamentId = randomUUID();
			const tournamentDB: LocalTournamentDB = {
				id: tournamentId,
				hostId,
				guest1Name: guestParticipants[0].id as string,
				guest2Name: guestParticipants[1].id as string,
				guest3Name: guestParticipants[2].id as string,
				semi1Id: semi1.game.id,
				semi2Id: semi2.game.id,
				finalId: final.game.id,
				winnerType: final.game.winnerType,
				winnerName: final.game.winnerType === 'host' ? 'host' : final.game.winnerGuestName!,
				date: new Date()
			};

			this.db.saveLocalTournament(tournamentDB);
			this.log.info({ tournamentId, hostId, winner: tournamentDB.winnerName, winnerType: tournamentDB.winnerType }, 'Local tournament saved successfully');
		} catch (error: any) {
			if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
				throw new ConflictError('Game ID already exists');
			}
			throw error;
		}
	}

	/**
	 * Get paginated list of games for a player
	 * @param userId - The player's user ID
	 * @param page - Page number (1-indexed)
	 * @param perPage - Number of games per page
	 * @returns Array of game results in API format
	 */
	getPlayerGames(userId: UserId, page: number = 1, perPage: number = 25): GameResultAPI[] {
		const offset = (page - 1) * perPage;
		const rows = this.db.getGamesByPlayer(userId, perPage, offset);
		return rows.map(row => this.transformGameRow(row));
	}

	/**
	 * Get paginated list of tournaments for a player
	 * @param userId - The player's user ID
	 * @param page - Page number (1-indexed)
	 * @param perPage - Number of tournaments per page
	 * @returns Array of tournament results in API format
	 */
	getPlayerTournaments(userId: UserId, page: number = 1, perPage: number = 20): TournamentResultAPI[] {
		const offset = (page - 1) * perPage;
		const rows = this.db.getTournamentsByPlayer(userId, perPage, offset);
		return rows.map(row => this.transformTournamentRow(row));
	}

	/**
	 * Get comprehensive stats for a player
	 * - Lifetime win/draw/loss stats
	 * - Daily stats for last 7 days
	 * - 5 most recent games
	 * - 5 most recent tournaments
	 * @param userId - The player's user ID
	 * @returns Complete player statistics
	 */
	getPlayerStats(userId: UserId): GameStatsAPI {
		const lifetimeStats = this.db.getGameStatsByPlayer(userId);
		const dailyRows = this.db.getDailyStatsByPlayer(userId);
		const daily: DailyPlayerStatsAPI[] = dailyRows.slice(0, 7).map((row: any) => ({
			day: row.day,
			wins: row.wins,
			draws: row.draws,
			losses: row.losses,
		}));
		const recentGameRows = this.db.getRecentGamesByPlayer(userId, 5);
		const recentGames = recentGameRows.map(row => this.transformGameRow(row)) ?? [];
		const recentTournamentRows = this.db.getRecentTournamentsByPlayer(userId, 5);
		const recentTournaments = recentTournamentRows.map(row => this.transformTournamentRow(row));

		return {
			lifetime: {
				wins: lifetimeStats.wins || 0,
				draws: lifetimeStats.draws || 0,
				losses: lifetimeStats.losses || 0,
			},
			daily,
			recentMatches: recentGames,
			recentTournaments,
		};
	}

	/**
	 * Get a specific game by ID
	 * @param gameId - The game ID
	 * @returns Game result in API format
	 * @throws NotFoundError if game doesn't exist
	 */
	getGameById(gameId: GameId): GameResultAPI {
		const row = this.db.getGameById(gameId);
		if (!row) throw new NotFoundError('Game not found');
		return this.transformGameRow(row);
	}

	/**
	 * Get a specific tournament by ID with all its games
	 * @param tournamentId - The tournament ID
	 * @returns Tournament result in API format
	 * @throws NotFoundError if tournament doesn't exist
	 */
	getTournamentById(tournamentId: TournamentId): TournamentResultAPI {
		const row = this.db.getTournamentById(tournamentId);
		if (!row) throw new NotFoundError('Tournament not found');
		return this.transformTournamentRow(row);
	}

	/**
	 * Get paginated list of local games for a player
	 * @param userId - The host's user ID
	 * @param page - Page number (1-indexed)
	 * @param perPage - Number of games per page
	 * @returns Array of local game results
	 */
	getLocalGamesByPlayer(userId: UserId, page: number = 1, perPage: number = 25): any[] {
		const offset = (page - 1) * perPage;
		const rows = this.db.getLocalGamesByPlayer(userId, perPage, offset);
		return rows.map(row => this.transformLocalGameRow(row));
	}

	/**
	 * Get paginated list of local tournaments for a player
	 * @param userId - The host's user ID
	 * @param page - Page number (1-indexed)
	 * @param perPage - Number of tournaments per page
	 * @returns Array of local tournament results
	 */
	getLocalTournamentsByPlayer(userId: UserId, page: number = 1, perPage: number = 20): any[] {
		const offset = (page - 1) * perPage;
		const rows = this.db.getLocalTournamentsByPlayer(userId, perPage, offset);
		return rows.map(row => this.transformLocalTournamentRow(row));
	}
}
