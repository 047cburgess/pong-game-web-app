import fp from 'fastify-plugin';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import seedDatabase from './seed';
import { prepareStatements } from './statements';
import { createTablesSQL } from './schema';
import { UserId, GameId, TournamentId, GameResultDB, GameResultAPI, TournamentResultAPI, GameParticipationDB, TournamentResultDB, TournamentParticipationDB, DailyPlayerStatsAPI, PlayerStatsAPI, LocalGameDB, LocalGameParticipantDB, LocalTournamentDB } from '../types';
import type { FastifyInstance } from 'fastify';


declare module 'fastify' {
  interface FastifyInstance {
    db: {
      // inserts
      saveGame(game: GameResultDB, participations: GameParticipationDB[]): void;
      saveTournament(tournament: TournamentResultDB, participations: TournamentParticipationDB[]): void;
      saveLocalGame(game: LocalGameDB, participants: LocalGameParticipantDB[]): void;
      saveLocalTournament(tournament: LocalTournamentDB): void;

      // selects (unprocessed rows -> processing is done in GameHistoryManager)
      getGamesByPlayer(userId: UserId, limit: number, offset: number): any[];
      getTournamentsByPlayer(userId: UserId, limit: number, offset: number): any[];
      getGameStatsByPlayer(userId: UserId): any;
      getDailyStatsByPlayer(userId: UserId): any[];
      getRecentGamesByPlayer(userId: UserId, limit: number): any[];
      getRecentTournamentsByPlayer(userId: UserId, limit: number): any[];
      getGameById(id: GameId): any;
      getTournamentById(id: TournamentId): any;
    };
  }
}

async function dbPlugin(fastify: FastifyInstance) {
  const dbPath = './data/matchmaking.db';
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  db.exec(createTablesSQL);

  const stmts = prepareStatements(db);

  const isEmpty = db.prepare("SELECT COUNT(*) AS count FROM games").get().count === 0;
  if (isEmpty) {
    fastify.log.info("Seeding database with mock data");
    seedDatabase(db);
  }

  const dbOperations = {
    saveGame(game: GameResultDB, participations: GameParticipationDB[]): void {
      const transaction = db.transaction(() => {
        stmts.insertGame.run(
          game.id,
          game.mode,
          game.tournamentId || null,
          game.winnerId || null,
          game.date.toISOString(),
          game.duration
        );
        participations.forEach((player) => {
          stmts.insertGameParticipation.run(game.id, player.userId, player.score, player.result);
        });
      });

      try {
        transaction();
      } catch (err) {
        fastify.log.error({ err, gameId: game.id }, 'DB error: saveGame failed');
        throw err;
      }
    },

    saveTournament(tournament: TournamentResultDB, participations: TournamentParticipationDB[]): void {
      const transaction = db.transaction(() => {
        stmts.insertTournament.run(
          tournament.id,
          tournament.semi1Id,
          tournament.semi2Id,
          tournament.finalId,
          tournament.winnerId,
          tournament.date.toISOString()
        );
        participations.forEach((player) => {
          stmts.insertTournamentParticipation.run(tournament.id, player.userId);
        });
      });

      try {
        transaction();
      } catch (err) {
        fastify.log.error({ err, tournamentId: tournament.id }, 'DB error: saveTournament failed');
        throw err;
      }
    },

    saveLocalGame(game: LocalGameDB, participants: LocalGameParticipantDB[]): void {
      const transaction = db.transaction(() => {
        stmts.insertLocalGame.run(
          game.id,
          game.hostId,
          game.date.toISOString(),
          game.duration,
          game.winnerType || null,
          game.winnerGuestName || null
        );
        participants.forEach((participant) => {
          stmts.insertLocalGameParticipant.run(
            game.id,
            participant.position,
            participant.guestName || null,
            participant.score
          );
        });
      });

      try {
        transaction();
      } catch (err) {
        fastify.log.error({ err, gameId: game.id }, 'DB error: saveLocalGame failed');
        throw err;
      }
    },

    saveLocalTournament(tournament: LocalTournamentDB): void {
      const transaction = db.transaction(() => {
        stmts.insertLocalTournament.run(
          tournament.id,
          tournament.hostId,
          tournament.guest1Name,
          tournament.guest2Name,
          tournament.guest3Name,
          tournament.semi1Id,
          tournament.semi2Id,
          tournament.finalId,
          tournament.winnerType,
          tournament.winnerName,
          tournament.date.toISOString()
        );
      });

      try {
        transaction();
      } catch (err) {
        fastify.log.error({ err, tournamentId: tournament.id }, 'DB error: saveLocalTournament failed');
        throw err;
      }
    },

    getGamesByPlayer(userId: UserId, limit: number, offset: number): any[] {
      return stmts.getGamesByPlayer.all(userId, limit, offset);
    },

    getTournamentsByPlayer(userId: UserId, limit: number, offset: number): any[] {
      return stmts.getTournamentsByPlayer.all(userId, limit, offset);
    },

    getGameStatsByPlayer(userId: UserId): any {
      return stmts.getGameStatsByPlayer.get(userId);
    },

    getDailyStatsByPlayer(userId: UserId): any[] {
      return stmts.getDailyStatsByPlayer.all(userId);
    },

    getRecentGamesByPlayer(userId: UserId, limit: number = 5): any[] {
      return stmts.getRecentGamesByPlayer.all(userId, limit);
    },

    getRecentTournamentsByPlayer(userId: UserId, limit: number = 5): any[] {
      return stmts.getRecentTournamentsByPlayer.all(userId, limit);
    },

    getGameById(id: GameId): any {
      return stmts.getGameById.get(id);
    },

    getTournamentById(id: TournamentId): any {
      return stmts.getTournamentById.get(id);
    },
  };

  fastify.decorate('db', dbOperations);
  fastify.log.info('Database ready!');

  fastify.addHook('onClose', (_, done) => {
    fastify.log.info('Closing database!');
    db.close();
    done();
  });
}

export default fp(dbPlugin, { name: 'database' });

