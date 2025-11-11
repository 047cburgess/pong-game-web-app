import type { FastifyBaseLogger } from 'fastify';
import { GameId } from '../types.js';

export type GameType = 'custom' | 'queue' | 'tournament';

export interface GameRegistryEntry {
	type: GameType;
	createdAt: Date;
}

export class GameRegistry {
	private log: FastifyBaseLogger;
	private games: Map<GameId, GameRegistryEntry>;

	constructor(logger: FastifyBaseLogger) {
		this.log = logger;
		this.games = new Map();
	}

	register(gameId: GameId, type: GameType): void {
		this.games.set(gameId, { type, createdAt: new Date() });
		this.log.debug({ gameId, type }, 'Game registered');
	}

	get(gameId: GameId): GameRegistryEntry | undefined {
		return this.games.get(gameId);
	}

	has(gameId: GameId): boolean {
		return this.games.has(gameId);
	}

	unregister(gameId: GameId): boolean {
		const existed = this.games.delete(gameId);
		if (existed) {
			this.log.debug({ gameId }, 'Game unregistered');
		}
		return existed;
	}

	/**
	 * Clean up games older than the specified age
	 * @param maxAgeMs - Maximum age in milliseconds before cleanup
	 * @returns Array of game IDs that were cleaned up
	 */
	cleanupOldGames(maxAgeMs: number): GameId[] {
		const now = Date.now();
		const staleGames: GameId[] = [];

		for (const [gameId, entry] of this.games.entries()) {
			const age = now - entry.createdAt.getTime();
			if (age > maxAgeMs) {
				staleGames.push(gameId);
			}
		}

		staleGames.forEach(gameId => {
			this.games.delete(gameId);
		});

		if (staleGames.length > 0) {
			this.log.info(
				{ count: staleGames.length, maxAgeMs },
				'Cleaned up stale games from registry'
			);
		}

		return staleGames;
	}

	/**
	 * Get count of games in registry by type
	 * @returns Object with counts per game type
	 */
	getStats(): { total: number; custom: number; queue: number; tournament: number } {
		const stats = { total: 0, custom: 0, queue: 0, tournament: 0 };

		for (const entry of this.games.values()) {
			stats.total++;
			stats[entry.type]++;
		}

		return stats;
	}
}
