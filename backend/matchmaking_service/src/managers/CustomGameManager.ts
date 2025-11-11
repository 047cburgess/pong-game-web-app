import { GameServiceClient } from '../clients/game-service.client.js';
import { EventManager, InviteResponseEvent } from './EventManager.js';
import { GameRegistry } from './GameRegistry.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { GameKey, NewGameRequest, UserId, GameId, GameStatus, GameInviteEvent, GameResultWebhook, GameResultDB, GameParticipationDB } from '../types.js';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

export interface CustomGame {
	gameId: GameId;
	hostId: UserId;
	capacity: number;
	invitedPlayers: UserId[];
	acceptedPlayers:UserId[];
	keys: GameKey[]; // same number as max players/capacity
	status: GameStatus;
	createdAt: Date;
}

export class CustomGameManager {
	private log: FastifyBaseLogger;
	private gameClient: GameServiceClient;
	private eventManager: EventManager;
	private gameRegistry: GameRegistry;
	private db: FastifyInstance['db'];
	private games: Map<GameId, CustomGame>;

	constructor(gameClient: GameServiceClient, logger: FastifyBaseLogger, eventManager: EventManager, gameRegistry: GameRegistry, db: FastifyInstance['db']) {
		this.log = logger;
		this.gameClient = gameClient;
		this.eventManager = eventManager;
		this.gameRegistry = gameRegistry;
		this.db = db;
		this.games = new Map();
	}

	private getGame(gameId: GameId): CustomGame {
		const game = this.games.get(gameId);
		if (!game) throw new NotFoundError('Game not found');
		return game;
	}

	/**
	 * Create a custom game and invite players
	 * - Requests a game from game service with specified capacity
	 * - Registers game in global registry
	 * - Sends SSE invites to all invited players
	 * @param hostId - The user ID of the player creating the game
	 * @param playersToInvite - Array of user IDs to invite
	 * @param capacity - Maximum number of players (including host)
	 * @returns Game key for the host to connect
	 * @throws BadRequestError if not enough players invited for capacity, invited self, or invited same player multiple times
	 */
	async createGame(hostId: UserId, playersToInvite: UserId[], capacity: number): Promise<GameKey> {
		if (playersToInvite.includes(hostId)) {
			throw new BadRequestError('You cannot invite yourself');
		}

		const uniqueInvites = new Set(playersToInvite);
		if (uniqueInvites.size !== playersToInvite.length) {
			throw new BadRequestError('Cannot invite the same player multiple times');
		}

		if (playersToInvite.length < capacity - 1)
			throw new BadRequestError('Number of players is less than the room size');

		const webhookUrl = `${process.env.SERVICE_URL}/webhooks/games/GAME_ID/result`;

		const request: NewGameRequest & { hook?: string } = {
			nPlayers: capacity,
			hook: webhookUrl  // Will be replaced with actual gameId by game service
		};
		const response = await this.gameClient.createGame(request);
		const gameKeys: GameKey[] = response.gameKeys;
		const gameId: GameId = gameKeys[0].gameId;

		// for routing
		this.gameRegistry.register(gameId, 'custom');

		// local management
		this.games.set(gameId, {
			gameId,
			hostId,
			capacity,
			invitedPlayers: playersToInvite,
			acceptedPlayers: [],
			keys: gameKeys,
			status: 'pending',
			createdAt: new Date()
		});
		const invite: GameInviteEvent = {
			event: 'GameInvite',
			gameId,
			from: hostId
		}

		const deliveredTo = this.eventManager.broadcastEvent(playersToInvite, invite);

		this.log.debug(
			{ gameId, invited: playersToInvite, notified: deliveredTo },
			`Invited ${playersToInvite.length} players to custom game, ${deliveredTo.length} notified via SSE`
		);

		// host's game key
		return gameKeys[0];
	}

	/**
	 * Accept a custom game invitation
	 * - Validates player was invited and game is still waiting
	 * - Adds player to accepted list
	 * - Marks game as 'ready' when all players have accepted
	 * @param gameId - The ID of the game
	 * @param playerId - The user ID accepting the invite
	 * @returns Game key for the player to connect
	 * @throws NotFoundError if game doesn't exist
	 * @throws ForbiddenError if player wasn't invited
	 * @throws ConflictError if player already accepted or game already started
	 */
	acceptInvite(gameId: GameId, playerId: UserId): GameKey {
		const game = this.getGame(gameId);

		if (!game.invitedPlayers.includes(playerId)) {
			throw new ForbiddenError('You were not invited to this game');
		}

		if (game.acceptedPlayers?.includes(playerId)) {
			throw new ConflictError('You already accepted this invite');
		}

		if (game.status !== 'pending') {
			throw new ConflictError('Game already started or full');
		}

		if (!game.acceptedPlayers) {
			game.acceptedPlayers = [];
		}
		game.acceptedPlayers.push(playerId);

		const keyIndex = game.acceptedPlayers.length;
		const playerKey = game.keys[keyIndex];

		this.log.info({ gameId, playerId, accepted: game.acceptedPlayers.length, capacity: game.capacity },
			'Player accepted custom game invite');

		if (game.acceptedPlayers.length === game.capacity - 1) { // -1 for host
			game.status = 'ready';
			this.log.info({ gameId }, 'Custom game is ready - all players accepted');
		}

		return playerKey;
	}

	/**
	 * Decline a custom game invitation
	 * - Removes player from invited list
	 * - Sends SSE notification to host about the decline
	 * @param gameId - The ID of the game
	 * @param playerId - The user ID declining the invite
	 * @throws NotFoundError if game doesn't exist
	 * @throws ForbiddenError if player wasn't invited
	 */
	declineInvite(gameId: GameId, playerId: UserId): void {
		const game = this.getGame(gameId);

		if (!game.invitedPlayers.includes(playerId)) {
			throw new ForbiddenError('You were not invited to this game');
		}

		this.log.info({ gameId, playerId, remaining: game.invitedPlayers.length },
			'Player declined custom game invite');

		// Notify host that player declined
		const declineEvent: InviteResponseEvent = {
			event: 'InviteDeclined',
			gameId,
			playerId
		};

		const delivered = this.eventManager.sendEvent(game.hostId, declineEvent);
		if (delivered) {
			this.log.debug({ gameId, playerId, hostId: game.hostId }, 'Decline notification sent to host');
		} else {
			this.log.debug({ gameId, playerId, hostId: game.hostId }, 'Host offline, decline notification not sent');
		}
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
			this.log.warn({ gameId: gameResult.id }, 'Received completion for unknown custom game');
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


		const participations: GameParticipationDB[] = gameResult.players.map(player => {
			let gresult: 'win' | 'loss' | 'draw';

			if (gameResult.winnerId === null){
				gresult = 'draw';
			}
			else if (gameResult.winnerId === player.id) {
				gresult = 'win';
			}
			else {
				gresult = 'loss';
			}

			return {
				userId: player.id,
				score: player.score,
				result: gresult,
			};

		});

		this.gameRegistry.unregister(gameResult.id);
		this.db.saveGame(gameDB, participations);
		this.log.info({ gameId: gameResult.id }, 'Custom game saved to database');

		this.games.delete(gameResult.id);
		this.log.info({ gameId: gameResult.id }, 'Custom game completed and cleaned up');
	}

	/**
	 * Clean up abandoned custom games older than the specified age
	 * Games that are pending or ready but never completed will be removed
	 * Completed games are cleaned up via the webhook handler
	 * @param maxAgeMs - Maximum age in milliseconds before cleanup
	 * @returns Number of games cleaned up
	 */
	cleanupAbandonedGames(maxAgeMs: number): number {
		const now = Date.now();
		const staleGames: GameId[] = [];

		for (const [gameId, game] of this.games.entries()) {
			const age = now - game.createdAt.getTime();
			if (age > maxAgeMs && (game.status === 'pending' || game.status === 'ready')) {
				staleGames.push(gameId);
			}
		}

		staleGames.forEach(gameId => {
			this.games.delete(gameId);
			this.gameRegistry.unregister(gameId);
		});

		if (staleGames.length > 0) {
			this.log.info(
				{ count: staleGames.length, maxAgeMs },
				'Cleaned up abandoned custom games'
			);
		}

		return staleGames.length;
	}
}
