import axios, { AxiosInstance } from 'axios';
import { NewGameResponse, NewGameRequest, NewTournamentGameRequest, NewTournamentGameResponse } from '../types';
import { z } from 'zod';

const gameKeySchema = z.object({
	key: z.string(),
	gameId: z.string(),
	expires: z.string().transform(str => new Date(str))
});

const createGameResponseSchema = z.object({
	gameKeys: z.array(gameKeySchema)
});

const createTournamentGameResponseSchema = z.object({
	gameKeys: z.array(gameKeySchema),
	viewingKey: z.string()
});

export class GameServiceClient {
	private client: AxiosInstance;

	constructor() {
		const baseURL = process.env.GAME_SERVICE_URL || 'http://game-service:3001';

		this.client = axios.create({
			baseURL,
			timeout: 5000,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Create a new custom/matchmaking game (classic mode)
	async createGame(request: NewGameRequest): Promise<NewGameResponse> {
		try {
			const response = await this.client.post('/internal/games/classic/create', request);
			return createGameResponseSchema.parse(response.data);
		} catch (err: any) {
			throw new Error(`Failed to communicate with game service: ${err.message}`);
		}
	}

	// Create a new tournament game (tournament mode)
	async createTournamentGame(request: NewTournamentGameRequest): Promise<NewTournamentGameResponse> {
		try {
			const response = await this.client.post('/internal/games/tournament/create', request);
			return createTournamentGameResponseSchema.parse(response.data);
		} catch (err: any) {
			throw new Error(`Failed to communicate with game service: ${err.message}`);
		}
	}
}

