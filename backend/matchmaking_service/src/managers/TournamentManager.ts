//TODO: cleanup mechanism for failed/aborted games/tournaments -> expire after X
//TODO: testing
//TODO: integration with game server & front end
import { randomUUID } from 'crypto';
import { GameServiceClient } from '../clients/game-service.client';
import { EventManager, InviteResponseEvent } from './EventManager';
import { GameRegistry } from './GameRegistry';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import {
	GameKey,
	TournamentId,
	TournamentGame,
	UserId,
	GameId,
	GameStatus,
	GameResultWebhook,
	GameResultDB,
	GameParticipationDB,
	TournamentInviteEvent,
	NewTournamentResponse,
	InviteToTournamentResponse,
	JoinTournamentResponse,
	TournamentStatusAPI,
	Tournament,
	TournamentStatus,
	Player
} from '../types';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

const CAPACITY = 4;

export class TournamentManager {
  private log: FastifyBaseLogger;
  private gameClient: GameServiceClient;
  private eventManager: EventManager;
  private gameRegistry: GameRegistry;
  private db: FastifyInstance['db'];
  private tournaments: Map<TournamentId, Tournament>;
  private games: Map<GameId, TournamentGame>;

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

  async createTournament(hostId: UserId, playersToInvite?: UserId[]): Promise<NewTournamentResponse> {
    if (playersToInvite?.includes(hostId)) {
	    throw new BadRequestError('Cannot invite yourself');
    }
    if (playersToInvite && new Set(playersToInvite).size !== playersToInvite.length) {
	    throw new BadRequestError('Duplicate invites');
    }
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

    let delivered: UserId[] = [];
    if (playersToInvite && playersToInvite.length > 0) {
      const invite: TournamentInviteEvent = { event: 'TournamentInvite', tournamentId, from: hostId };
      delivered = this.eventManager.broadcastEvent(playersToInvite, invite);
    }

    return { tournamentId, invitedPlayers: delivered };
  }

  async createTournamentGame(tournamentId: TournamentId, stage: TournamentStatus, players: Player[]): Promise<TournamentGame> {
    const response = await this.gameClient.createTournamentGame({ nPlayers: 2 });
    const gameKeys: GameKey[] = response.gameKeys;
    const viewingKey: string = response.viewingKey;
    const gameId: GameId = gameKeys[0].gameId;

    this.gameRegistry.register(gameId, 'tournament');

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
    return game;
  }

  invitePlayer(tournamentId: TournamentId, hostId: UserId, playerIds: UserId[]): InviteToTournamentResponse {
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

    const invite: TournamentInviteEvent = { event: 'TournamentInvite', tournamentId, from: hostId };
    const delivered = this.eventManager.broadcastEvent(playerIds, invite);

    tournament.invitedPlayers.push(...delivered);

    return { tournamentId, invitedPlayers: delivered };
  }

  acceptInvite(tournamentId: TournamentId, playerId: UserId): JoinTournamentResponse {
    const tournament = this.getTournament(tournamentId);

    if (!tournament.invitedPlayers.includes(playerId) && tournament.hostId !== playerId)
	throw new ForbiddenError('Not invited');

    if (tournament.registeredPlayers.includes(playerId))
    	throw new ConflictError('Already registered');

    if (tournament.registeredPlayers.length >= CAPACITY || tournament.status !== 'waiting')
	throw new ConflictError('Tournament full or started');

    tournament.registeredPlayers.push(playerId);

    if (tournament.registeredPlayers.length === CAPACITY) {
      this.shufflePlayers(tournament);
      tournament.status = 'ready';
      this.log.info({ tournamentId }, 'Tournament ready');
      this.advanceTournament(tournamentId);
    }
    return { tournamentId };
  }

  declineInvite(tournamentId: TournamentId, playerId: UserId): void {
    const tournament = this.getTournament(tournamentId);

    if (!tournament.invitedPlayers.includes(playerId))
      throw new ForbiddenError('Not invited');

    if (tournament.registeredPlayers.includes(playerId))
      throw new ConflictError('Already registered');

    // Remove player from invited list
    tournament.invitedPlayers = tournament.invitedPlayers.filter(id => id !== playerId);

    const response: InviteResponseEvent = {
      event: 'InviteDeclined',
      gameId: null,
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

    const buildGameStatus = (stage: 'semi1' | 'semi2' | 'final') => {
      const gameId = tournament.games[stage];
      if (!gameId) {
        return {
          status: 'pending',
          players: []
        };
      }

      const game = this.games.get(gameId);
      if (!game) {
        return {
          status: 'pending',
          players: []
        };
      }

      return {
        id: game.id,
        status: game.status === 'complete' ? 'complete' : 'ready',
        players: game.players || [],
        winner: game.winner
      };
    };

    return {
      tournamentId,
      status: tournament.status,
      registeredPlayers: tournament.registeredPlayers,
      games: {
        semi1: buildGameStatus('semi1'),
        semi2: buildGameStatus('semi2'),
        final: buildGameStatus('final')
      },
      winner: tournament.winner
    };
  }

  private shufflePlayers(tournament: Tournament) {
    const arr = tournament.registeredPlayers;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  handleGameComplete(gameResult: GameResultWebhook): void {
    const game = this.games.get(gameResult.id);
    if (!game) return this.log.warn({ gameId: gameResult.id }, 'Unknown tournament game');
    if (game.status === 'complete') return;

    game.status = 'complete';
    game.winner = gameResult.winnerId;
    game.players[0].score = gameResult.players[0].score;
    game.players[1].score = gameResult.players[1].score;
    game.gameResult = gameResult;

    // trigger next stage
    this.advanceTournament(game.tournamentId);
  }

  async advanceTournament(tournamentId: TournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament)
	return;

    const [p1, p2, p3, p4] = tournament.registeredPlayers;

    switch (tournament.status) {
      case 'ready': {
        const game = await this.createTournamentGame(tournamentId, 'semi1', [{ id: p1, score: 0 }, { id: p2, score: 0 }]);
        tournament.games.semi1 = game.id;
        tournament.status = 'semi1';
        break;
      }
      case 'semi1': {
        const game = await this.createTournamentGame(tournamentId, 'semi2', [{ id: p3, score: 0 }, { id: p4, score: 0 }]);
        tournament.games.semi2 = game.id;
        tournament.status = 'semi2';
        break;
      }
      case 'semi2': {
        const semi1Winner = this.games.get(tournament.games.semi1)?.winner;
        const semi2Winner = this.games.get(tournament.games.semi2)?.winner;
        const game = await this.createTournamentGame(tournamentId, 'final', [{ id: semi1Winner, score: 0 }, { id: semi2Winner, score: 0 }]);
        tournament.games.final = game.id;
        tournament.status = 'final';
        break;
      }
      case 'final': {
        const finalWinner = this.games.get(tournament.games.final)?.winner;
        tournament.winner = finalWinner;
        tournament.status = 'complete';
        await this.saveTournament(tournamentId);
        setTimeout(() => this.cleanupTournament(tournamentId), 5 * 60 * 1000); // delay cleanup 5 mins for polling delay etc
        break;
      }
    }
  }

  async saveTournament(tournamentId: TournamentId) {
    this.log.debug({tournamentId}, 'Entered saveTournament function');
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    for (const stage of ['semi1', 'semi2', 'final']) {
      const gameId = tournament.games[stage];
      if (!gameId) continue;
      const game = this.games.get(gameId);
      if (!game?.gameResult) continue;

      const gameDB: GameResultDB = {
        id: game.gameResult.id,
        mode: 'tournament',
        tournamentId,
        winnerId: game.gameResult.winnerId ?? null,
        date: new Date(game.gameResult.date),
        duration: game.gameResult.duration
      };

      const participations: GameParticipationDB[] = game.gameResult.players.map(p => ({
        userId: p.id,
        score: p.score,
        result: p.id === game.gameResult.winnerId ? 'win' : 'loss'
      }));

      await this.db.saveGame(gameDB, participations);
    }

    const tournamentDB: TournamentResultDB = {
      id: tournament.id,
      semi1Id: tournament.games.semi1!,
      semi2Id: tournament.games.semi2!,
      finalId: tournament.games.final!,
      winnerId: tournament.winner!,
      date: tournament.createdAt
    };
    await this.db.saveTournament(tournamentDB);

    this.log.info({ tournamentId }, 'Tournament saved to DB');
  }

  private cleanupTournament(tournamentId: TournamentId) {
    this.log.debug({tournamentId}, 'Entered cleanupTournament function');
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    Object.values(tournament.games).forEach(gameId => {
      this.games.delete(gameId);
      this.gameRegistry.unregister(gameId);
    });

    this.tournaments.delete(tournamentId);
    this.log.info({ tournamentId }, 'Tournament cleaned from memory & registry');
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


