import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { GameServiceClient } from '../clients/game-service.client.js';
import { EventManager} from './EventManager.js';
import { GameRegistry } from './GameRegistry.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import {
	GameKey,
	TournamentId,
	TournamentGame,
	UserId,
	GameId,
	GameResultWebhook,
	GameResultDB,
	GameParticipationDB,
	TournamentResultDB,
	TournamentParticipationDB,
	TournamentInviteEvent,
	NewTournamentResponse,
	InviteToTournamentResponse,
	JoinTournamentResponse,
	TournamentStatusAPI,
	Tournament,
	Player,
	TournamentGameStage
} from '../types.js';
import { TournamentInviteResponseEvent } from './EventManager.js';

const CAPACITY = 4;

export class TournamentManager {
  private log: FastifyBaseLogger;
  private gameClient: GameServiceClient;
  private eventManager: EventManager;
  private gameRegistry: GameRegistry;
  private db: FastifyInstance['db'];
  private tournaments: Map<TournamentId, Tournament>;
  private games: Map<GameId, TournamentGame>;
  private cleanupTimeouts: Map<TournamentId, NodeJS.Timeout>;

  constructor(
    gameClient: GameServiceClient,
    logger: FastifyBaseLogger,
    eventManager: EventManager,
    gameRegistry: GameRegistry,
    db: FastifyInstance['db']
  ) {
    this.log = logger;
    this.gameClient = gameClient;
    this.eventManager = eventManager;
    this.gameRegistry = gameRegistry;
    this.db = db;
    this.tournaments = new Map();
    this.games = new Map();
    this.cleanupTimeouts = new Map();
  }

  private getTournament(tournamentId: TournamentId): Tournament {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new NotFoundError('Tournament not found');
    return tournament;
  }

  private getTournamentGame(gameId: GameId): TournamentGame {
    const game = this.games.get(gameId);
    if (!game) throw new NotFoundError('Game not found');
    return game;
  }

  /**
  * Create a new tournament and invite players
  * - Creates a new tournament in memory
  * - Sends SSE invites to all invited players
  *   @param hostId - The user ID of the player creating the tournament
  *   @param playersToInvite - Optional array of user IDs to invite
  *   @returns TournamentID and list of successfully invited players
  *   @throws BadRequestError if invited self or invited same player multiple times
  */
  async createTournament(hostId: UserId, playersToInvite?: UserId[]): Promise<NewTournamentResponse> {
    this.log.info({ hostId, playersToInvite }, 'Creating new tournament');

    // Input validation
    if (playersToInvite?.includes(hostId)) {
	    throw new BadRequestError('Cannot invite yourself');
    }
    if (playersToInvite && new Set(playersToInvite).size !== playersToInvite.length) {
	    throw new BadRequestError('Duplicate invites');
    }

    // Create tournament object
    const tournamentId: TournamentId = randomUUID();
    const tournament: Tournament = {
      id: tournamentId,
      hostId,
      invitedPlayers: playersToInvite || [],
      registeredPlayers: [hostId],
      games: {},
      status: 'waiting',
      createdAt: new Date()
    };

    this.tournaments.set(tournamentId, tournament);
    this.log.debug({ tournamentId, hostId }, 'Tournament created in memory');
    
    // Send invites via SSE
    let delivered: UserId[] = [];
    if (playersToInvite && playersToInvite.length > 0) {
      const invite: TournamentInviteEvent = { event: 'TournamentInvite', tournamentId: tournamentId!, from: hostId };
      delivered = this.eventManager.broadcastEvent(playersToInvite, invite);
      this.log.info({ tournamentId, invitedCount: playersToInvite.length, deliveredCount: delivered.length }, 'Tournament invites sent');
    }

    return { tournamentId: tournamentId, invitedPlayers: delivered };
  }

  /**
   * Create a tournament game
  * - Requests a tournament game from game service with 2 players
  *   - Registers game in global registry
  *   - Stores game in memory
  *   @param tournamentId 
  *   @param stage - Stage of tourn (semi1, semi2, final)
  *   @param players - Array of 2 players for the game 
  *   @returns TournamentGame object
  *   @throws Error is game creation fails
  */
  async createTournamentGame(tournamentId: TournamentId, stage: TournamentGameStage, players: Player[]): Promise<TournamentGame> {
    this.log.info({ tournamentId, stage, players: players.map(p => p.id) }, 'Creating tournament game');

    const webhookUrl = `${process.env.SERVICE_URL}/webhooks/games/GAME_ID/result`;
    const response = await this.gameClient.createTournamentGame({
      nPlayers: 2,
      hook: webhookUrl
    });
    const gameKeys: GameKey[] = response.gameKeys;
    const viewingKey: string = response.viewingKey;
    const gameId: GameId = gameKeys[0].gameId;

    this.gameRegistry.register(gameId, 'tournament');
    this.log.debug({ gameId, viewingKey, tournamentId, stage }, 'Game registered in registry');

    const game: TournamentGame = {
      id: gameId,
      tournamentId,
      stage,
      status: 'ready',
      players: [players[0], players[1]],
      gameKeys,
      viewingKey,
      createdAt: new Date()
    };

    this.games.set(gameId, game);
    this.log.info({ gameId, tournamentId, stage }, 'Tournament game created successfully');
    return game;
  }

  /**
   * Invite players to an existing tournament
  * - Sends SSE invites to all invited players
  *   @param tournamentId 
  *   @param hostId - one inviting players
  *   @param playerIds - Array of user IDs to invite
  *   @returns TournamentID andlist of successfully invited players
  *   @throws ForbiddenError if not host
  *   @throws ConflictError if tournament already started or players already invited/registered
  *   @throws BadRequestError if invited self or invited same player multiple times
  **/
  invitePlayer(tournamentId: TournamentId, hostId: UserId, playerIds: UserId[]): InviteToTournamentResponse {
    this.log.info({ tournamentId, hostId, playerIds }, 'Inviting players to tournament');
    const tournament = this.getTournament(tournamentId);

    if (tournament.hostId !== hostId)
      throw new ForbiddenError('Only host can invite players');

    if (tournament.status !== 'waiting')
      throw new ConflictError('Tournament already started');

    if (playerIds.includes(hostId))
      throw new BadRequestError('Cannot invite yourself');

    if (new Set(playerIds).size !== playerIds.length)
      throw new BadRequestError('Duplicate invites');

    // Check for players already invited or registered
    const alreadyInvited = playerIds.filter(id => tournament.invitedPlayers.includes(id) || tournament.registeredPlayers.includes(id));
    if (alreadyInvited.length > 0)
      throw new ConflictError(`Players already invited or registered: ${alreadyInvited.join(', ')}`);

    const invite: TournamentInviteEvent = { event: 'TournamentInvite', tournamentId: tournamentId!, from: hostId };
    const delivered = this.eventManager.broadcastEvent(playerIds, invite);

    tournament.invitedPlayers.push(...delivered);
    this.log.info({ tournamentId, deliveredCount: delivered.length }, 'Players invited successfully');

    return { tournamentId: tournamentId!, invitedPlayers: delivered };
  }

  acceptInvite(tournamentId: TournamentId, playerId: UserId): JoinTournamentResponse {
    this.log.info({ tournamentId, playerId }, 'Player accepting tournament invite');
    const tournament = this.getTournament(tournamentId);

    if (!tournament.invitedPlayers.includes(playerId) && tournament.hostId !== playerId)
	throw new ForbiddenError('Not invited');

    if (tournament.registeredPlayers.includes(playerId))
    	throw new ConflictError('Already registered');

    if (tournament.registeredPlayers.length >= CAPACITY || tournament.status !== 'waiting')
	throw new ConflictError('Tournament full or started');

    tournament.registeredPlayers.push(playerId);
    this.log.debug({ tournamentId, playerId, registeredCount: tournament.registeredPlayers.length }, 'Player registered');

    if (tournament.registeredPlayers.length === CAPACITY) {
      this.log.info({ tournamentId, players: tournament.registeredPlayers }, 'Tournament full - shuffling and starting');
      this.shufflePlayers(tournament);
      tournament.status = 'ready';
      this.log.info({ tournamentId, shuffledPlayers: tournament.registeredPlayers }, 'Tournament ready - starting games');
      this.advanceTournament(tournamentId);
    }
    return { tournamentId: tournamentId! };
  }

  declineInvite(tournamentId: TournamentId, playerId: UserId): void {
    const tournament = this.getTournament(tournamentId);

    if (!tournament.invitedPlayers.includes(playerId))
      throw new ForbiddenError('Not invited');

    if (tournament.registeredPlayers.includes(playerId))
      throw new ConflictError('Already registered');

    // Remove player from invited list
    tournament.invitedPlayers = tournament.invitedPlayers.filter(id => id !== playerId);

    const response: TournamentInviteResponseEvent = {
      event: 'TournamentInviteDeclined',
      tournamentId,
      from: playerId
    };
    this.eventManager.sendEvent(tournament.hostId, response);
  }

  getStatus(tournamentId: TournamentId, playerId: UserId): TournamentStatusAPI {
    const tournament = this.getTournament(tournamentId);

    // Check if player is part of tournament
    if (!tournament.registeredPlayers.includes(playerId) && !tournament.invitedPlayers.includes(playerId))
      throw new ForbiddenError('Not a participant in this tournament');

    const semi1Game = tournament.games.semi1 ? this.games.get(tournament.games.semi1) : undefined;
    const semi2Game = tournament.games.semi2 ? this.games.get(tournament.games.semi2) : undefined;
    const finalGame = tournament.games.final ? this.games.get(tournament.games.final) : undefined;

    return {
      tournamentId: tournamentId!,
      status: tournament.status,
      registeredPlayers: tournament.registeredPlayers,
      games: {
        semi1: {
          id: semi1Game?.id,
          status: semi1Game?.status ?? 'pending',
          players: semi1Game?.players ?? [],
          winner: semi1Game?.winner
        },
        semi2: {
          id: semi2Game?.id,
          status: semi2Game?.status ?? 'pending',
          players: semi2Game?.players ?? [],
          winner: semi2Game?.winner
        },
        final: {
          id: finalGame?.id,
          status: finalGame?.status ?? 'pending',
          players: finalGame?.players ?? [],
          winner: finalGame?.winner
        }
      }
    };
  }

  /** Shuffle registered players in tournament for random matchups */
  private shufflePlayers(tournament: Tournament) {
    const arr = tournament.registeredPlayers;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }


  /**
   * Handle game completion webhook from game service
  * - Updates tournament game state
  * - Advances tournament to the next stage
  * - Saves tournament to database if complete
  * @param gameResult - The game result raw data from the webhook
  */
  handleGameComplete(gameResult: GameResultWebhook): void {
    this.log.info({ gameId: gameResult.id, winnerId: gameResult.winnerId }, 'Received game completion webhook');
    const game = this.games.get(gameResult.id);
    if (!game) return this.log.warn({ gameId: gameResult.id }, 'Unknown tournament game');
    if (game.status === 'complete') {
      this.log.debug({ gameId: gameResult.id }, 'Game already marked complete');
      return;
    }

    // Update game state
    game.status = 'complete';
    game.winner = gameResult.winnerId ?? undefined;
    if (game.players) {
      game.players[0].score = gameResult.players[0].score;
      game.players[1].score = gameResult.players[1].score;
    }
    // save the raw webhook data to save altogether when tournament completed
    game.gameResult = gameResult;

    this.log.info({ gameId: gameResult.id, tournamentId: game.tournamentId, stage: game.stage, winner: game.winner }, 'Tournament game completed - advancing tournament');

    // trigger next stage of tournament
    this.advanceTournament(game.tournamentId);
  }

  // Advance tournament to next stage based on current status
  async advanceTournament(tournamentId: TournamentId) {
    this.log.debug({ tournamentId }, 'Advancing tournament');
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      this.log.warn({ tournamentId }, 'Tournament not found for advancement');
      return;
    }

    const [p1, p2, p3, p4] = tournament.registeredPlayers;
    this.log.info({ tournamentId, currentStatus: tournament.status }, 'Processing tournament advancement');

    switch (tournament.status) {
      case 'ready': {
        this.log.info({ tournamentId, p1, p2 }, 'Starting semifinal 1');
        const game = await this.createTournamentGame(tournamentId, 'semi1', [{ id: p1, score: 0 }, { id: p2, score: 0 }]);
        tournament.games.semi1 = game.id;
        tournament.status = 'semi1';
        this.log.info({ tournamentId, gameId: game.id }, 'Semifinal 1 created');
        break;
      }
      case 'semi1': {
        this.log.info({ tournamentId, p3, p4 }, 'Starting semifinal 2');
        const game = await this.createTournamentGame(tournamentId, 'semi2', [{ id: p3, score: 0 }, { id: p4, score: 0 }]);
        tournament.games.semi2 = game.id;
        tournament.status = 'semi2';
        this.log.info({ tournamentId, gameId: game.id }, 'Semifinal 2 created');
        break;
      }
      case 'semi2': {
        const semi1Winner = this.games.get(tournament.games.semi1!)?.winner;
        const semi2Winner = this.games.get(tournament.games.semi2!)?.winner;

        if (!semi1Winner || !semi2Winner) {
          this.log.error({ tournamentId, semi1Winner, semi2Winner }, 'Cannot create final - missing semifinal winners');
          return;
        }

        this.log.info({ tournamentId, semi1Winner, semi2Winner }, 'Starting final');
        const game = await this.createTournamentGame(tournamentId, 'final', [{ id: semi1Winner, score: 0 }, { id: semi2Winner, score: 0 }]);
        tournament.games.final = game.id;
        tournament.status = 'final';
        this.log.info({ tournamentId, gameId: game.id }, 'Final created');
        break;
      }
      case 'final': {
        const finalWinner = this.games.get(tournament.games.final!)?.winner;
        tournament.winner = finalWinner ?? undefined;
        tournament.status = 'complete';
        this.log.info({ tournamentId, winner: finalWinner }, 'Tournament complete - saving to database');
        await this.saveTournament(tournamentId);
        this.log.info({ tournamentId }, 'Tournament saved - scheduling cleanup in 5 minutes');
        const timeoutId = setTimeout(() => this.cleanupTournament(tournamentId), 5 * 60 * 1000);
        this.cleanupTimeouts.set(tournamentId, timeoutId);
        break;
      }
    }
  }

  async saveTournament(tournamentId: TournamentId) {
    this.log.debug({tournamentId}, 'Entered saveTournament function');
    const tournament = this.tournaments.get(tournamentId!);
    if (!tournament) return;

    for (const stage of ['semi1', 'semi2', 'final'] as const) {
      const gameId = tournament.games[stage];
      if (!gameId) continue;
      const game = this.games.get(gameId);
      if (!game?.gameResult) continue;

      const gameDB: GameResultDB = {
        id: game.gameResult.id,
        mode: 'tournament',
        tournamentId: tournamentId!,
        winnerId: game.gameResult.winnerId ?? null,
        date: new Date(game.gameResult.date),
        duration: game.gameResult.duration
      };

      const participations: GameParticipationDB[] = game.gameResult.players.map(p => ({
        userId: p.id,
        score: p.score,
        result: p.id === game.gameResult!.winnerId ? 'win' : 'loss'
      }));

      this.db.saveGame(gameDB, participations);
    }

    const tournamentDB: TournamentResultDB = {
      id: tournament.id!,
      semi1Id: tournament.games.semi1!,
      semi2Id: tournament.games.semi2!,
      finalId: tournament.games.final!,
      winnerId: tournament.winner!,
      date: tournament.createdAt
    };

    const participations: TournamentParticipationDB[] = tournament.registeredPlayers.map(userId => ({
      tournamentId: tournament.id!,
      userId
    }));

    this.db.saveTournament(tournamentDB, participations);

    this.log.info({ tournamentId }, 'Tournament saved to DB');
  }

  private cleanupTournament(tournamentId: TournamentId) {
    this.log.debug({tournamentId}, 'Entered cleanupTournament function');
    const tournament = this.tournaments.get(tournamentId!);
    if (!tournament) return;

    Object.values(tournament.games).forEach(gameId => {
      if (gameId) {
        this.games.delete(gameId);
        this.gameRegistry.unregister(gameId);
      }
    });

    this.tournaments.delete(tournamentId!);
    this.cleanupTimeouts.delete(tournamentId!);
    this.log.info({ tournamentId }, 'Tournament cleaned from memory & registry');
  }

  /**
   * Cancel all pending tournament cleanup timeouts
   * Called during server shutdown to prevent timeouts from keeping process alive
   */
  cancelAllCleanupTimeouts(): void {
    this.log.info({ count: this.cleanupTimeouts.size }, 'Cancelling all tournament cleanup timeouts');

    for (const [tournamentId, timeoutId] of this.cleanupTimeouts.entries()) {
      clearTimeout(timeoutId);
      this.log.debug({ tournamentId }, 'Tournament cleanup timeout cancelled');
    }

    this.cleanupTimeouts.clear();
    this.log.info('All tournament cleanup timeouts cancelled');
  }

  /**
   * Clean up abandoned tournaments
   * - Removes tournaments that are incomplete (pending/registration) and too old
   * - Completed tournaments are already cleaned up via scheduled cleanup after save
   * @param maxAgeMs - Maximum age in milliseconds for incomplete tournaments
   * @returns Number of tournaments cleaned up
   */
  cleanupAbandonedTournaments(maxAgeMs: number): number {
    const now = Date.now();
    const staleTournaments: TournamentId[] = [];

    for (const [tournamentId, tournament] of this.tournaments.entries()) {
      const age = now - tournament.createdAt.getTime();
      if (age > maxAgeMs && tournament.status !== 'complete') {
        staleTournaments.push(tournamentId);
      }
    }

    staleTournaments.forEach(tournamentId => {
      const tournament = this.tournaments.get(tournamentId);
      if (tournament) {
        Object.values(tournament.games).forEach(gameId => {
          if (gameId) {
            this.games.delete(gameId);
            this.gameRegistry.unregister(gameId);
          }
        });
        this.tournaments.delete(tournamentId);
      }
    });

    if (staleTournaments.length > 0) {
      this.log.info(
        { count: staleTournaments.length, maxAgeMs },
        'Cleaned up abandoned tournaments'
      );
    }

    return staleTournaments.length;
  }

  joinGame(gameId: GameId, playerId: UserId): GameKey {
    this.log.debug({gameId}, 'Entered join game function');
    const game = this.getTournamentGame(gameId);

    if (game.status === 'complete')
      throw new ConflictError('Game already completed');

    if (!game.players || game.players.length !== 2)
      throw new ConflictError('Game not ready');

    const [p1, p2] = game.players;
    if (playerId !== p1.id && playerId !== p2.id)
      throw new ForbiddenError('Not your game');

    if (!game.gameKeys || game.gameKeys.length !== 2)
      throw new ConflictError('Game keys not available');

    const key: GameKey = p1.id === playerId ? game.gameKeys[0] : game.gameKeys[1];
    return key;
  }

  viewGame(gameId: GameId, viewerId: UserId): { viewingKey: string; gameId: GameId } {
    this.log.debug({gameId, viewerId}, 'Entered view game function');
    const game = this.getTournamentGame(gameId);

    if (game.status === 'complete')
      throw new ConflictError('Game already completed');

    const tournament = this.getTournament(game.tournamentId);
    if (!tournament.registeredPlayers.includes(viewerId))
      throw new ForbiddenError('Not a participant in this tournament');

    if (game.players && game.players.some(p => p.id === viewerId))
      throw new ConflictError('You are a player in this game, use join endpoint instead');

    if (!game.viewingKey)
      throw new ConflictError('Viewing key not available');
    return { viewingKey: game.viewingKey, gameId: game.id };
  }
}


