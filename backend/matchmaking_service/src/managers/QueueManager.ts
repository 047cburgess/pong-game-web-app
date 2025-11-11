import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { GameServiceClient } from '../clients/game-service.client.js';
import { GameRegistry } from './GameRegistry.js';
import { ConflictError } from '../utils/errors.js';
import { UserId, GameId, GameKey, NewGameRequest, GameResultWebhook, GameResultDB, GameParticipationDB } from '../types.js';

interface WaitingGame {
	gameId: GameId;
	firstPlayerId: UserId;
	secondKey: GameKey;
	createdAt: Date;
}

export class QueueManager {
	private log: FastifyBaseLogger;
	private gameClient: GameServiceClient;
	private gameRegistry: GameRegistry;
	private db: FastifyInstance['db'];
	private waitingGame: WaitingGame | null;
	private games: Map<GameId, { players: UserId[]; createdAt: Date }>;

	constructor(
		logger: FastifyBaseLogger,
		gameClient: GameServiceClient,
		gameRegistry: GameRegistry,
		db: FastifyInstance['db']
	) {
		this.log = logger;
		this.gameClient = gameClient;
		this.gameRegistry = gameRegistry;
		this.db = db;
		this.waitingGame = null;
		this.games = new Map();
	}

	/**
	 * Add a player to the matchmaking queue
	 * - If queue is empty, creates a new game and player waits
	 * - If someone is waiting, matches them together immediately
	 * @param userId - The ID of the player joining the queue
	 * @returns Game key for the player to connect to the game service
	 * @throws ConflictError if player is already in queue or in an active queue game
	 */
	async joinQueue(userId: UserId): Promise<GameKey> {
		if (this.waitingGame && this.waitingGame.firstPlayerId === userId) {
			throw new ConflictError('You are already in the queue');
		}

		for (const game of this.games.values()) {
			if (game.players.includes(userId)) {
				throw new ConflictError('You are already in an active game');
			}
		}

		if (!this.waitingGame) {
			this.log.info({ userId }, 'Creating new game for first player');

			const webhookUrl = `${process.env.SERVICE_URL}/webhooks/games/GAME_ID/result`;
			const request: NewGameRequest & { hook?: string } = {
				nPlayers: 2,
				hook: webhookUrl
			};

			const response = await this.gameClient.createGame(request);
			const gameKeys = response.gameKeys;
			const gameId = gameKeys[0].gameId;

			this.gameRegistry.register(gameId, 'queue');
			this.waitingGame = {
				gameId,
				firstPlayerId: userId,
				secondKey: gameKeys[1],
				createdAt: new Date()
			};

			this.log.info(
				{ gameId, firstPlayer: userId },
				'First player sent to waiting game'
			);

			return gameKeys[0];
		}

		const game = this.waitingGame;
		this.log.info(
			{ gameId: game.gameId, player1: game.firstPlayerId, player2: userId },
			'Second player sent to waiting game - match complete!'
		);

		this.games.set(game.gameId, {
			players: [game.firstPlayerId, userId],
			createdAt: game.createdAt
		});
		this.waitingGame = null;

		return game.secondKey;
	}

	/**
	 * Process game completion webhook from game service
	 * - Prepares game result and player participations for database
	 * - Handles draw cases (when winnerId is null)
	 * - Saves to database
	 * - Cleans up internal state and unregisters from registry
	 * @param gameResult - The game result data from the webhook
	 */
	handleGameComplete(gameResult: GameResultWebhook): void {
		const game = this.games.get(gameResult.id);
		if (!game) {
			this.log.warn({ gameId: gameResult.id }, 'Received completion for unknown queue game');
			return;
		}

		const gameDB: GameResultDB = {
			id: gameResult.id,
			mode: 'classic',
			tournamentId: null,
			winnerId: gameResult.winnerId ?? null,
			date: new Date(gameResult.date),
			duration: gameResult.duration,
		};

		const participations: GameParticipationDB[] = gameResult.players.map(player => ({
			userId: player.id,
			score: player.score,
			result: gameResult.winnerId === null
				? 'draw'
				: player.id === gameResult.winnerId ? 'win' : 'loss'
		}));

		this.db.saveGame(gameDB, participations);
		this.log.info({ gameId: gameResult.id }, 'Queue game saved to database');

		this.games.delete(gameResult.id);
		this.gameRegistry.unregister(gameResult.id);
		this.log.info({ gameId: gameResult.id }, 'Queue game completed and cleaned up');
	}

	/**
	 * Clean up abandoned queue games
	 * - Clears waiting game if player never returned (1 player waiting too long)
	 * - Clears matched games that were never completed
	 * @param waitingMaxAgeMs - Max age for a waiting game (single player)
	 * @param activeMaxAgeMs - Max age for an active game (both players joined but never completed)
	 * @returns Object with counts of cleaned games
	 */
	cleanupAbandonedGames(waitingMaxAgeMs: number, activeMaxAgeMs: number): { waiting: number; active: number } {
		const now = Date.now();
		let cleaned = { waiting: 0, active: 0 };

		// Clean up waiting game if too old
		if (this.waitingGame) {
			const age = now - this.waitingGame.createdAt.getTime();
			if (age > waitingMaxAgeMs) {
				this.log.info(
					{ gameId: this.waitingGame.gameId, firstPlayer: this.waitingGame.firstPlayerId, ageMs: age },
					'Cleaning up abandoned waiting game'
				);
				this.gameRegistry.unregister(this.waitingGame.gameId);
				this.waitingGame = null;
				cleaned.waiting = 1;
			}
		}

		// Clean up active games that are too old
		const staleGames: GameId[] = [];
		for (const [gameId, game] of this.games.entries()) {
			const age = now - game.createdAt.getTime();
			if (age > activeMaxAgeMs) {
				staleGames.push(gameId);
			}
		}

		staleGames.forEach(gameId => {
			this.games.delete(gameId);
			this.gameRegistry.unregister(gameId);
		});

		cleaned.active = staleGames.length;

		if (cleaned.waiting > 0 || cleaned.active > 0) {
			this.log.info(
				{ waiting: cleaned.waiting, active: cleaned.active },
				'Cleaned up abandoned queue games'
			);
		}

		return cleaned;
	}
}
