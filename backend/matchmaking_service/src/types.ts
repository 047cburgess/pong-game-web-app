import type { components as PublicAPIComponents } from './@types/PublicAPI.js';
import type { components as InternalAPIComponents } from './@types/InternalApi.js';

export type GameResultAPI = PublicAPIComponents['schemas']['GameResult'];
export type TournamentResultAPI = PublicAPIComponents['schemas']['TournamentResult'];
export type GameStatsAPI = PublicAPIComponents['schemas']['GameStats'];
export type LocalGameSubmission = PublicAPIComponents['schemas']['LocalGameSubmission'];
export type LocalTournamentSubmission = PublicAPIComponents['schemas']['LocalTournamentSubmission'];
export type TournamentStatusAPI = PublicAPIComponents['schemas']['TournamentStatusResponse'];
export type GameKey = PublicAPIComponents['schemas']['GameKey'];
export type GameInviteEvent = PublicAPIComponents['schemas']['GameInvite'];
export type TournamentInviteEvent = PublicAPIComponents['schemas']['TournamentInvite'];
export type NewTournamentResponse = PublicAPIComponents['schemas']['CreateTournamentResponse'];
export type InviteToTournamentResponse = PublicAPIComponents['schemas']['InviteTournamentResponse'];
export type JoinTournamentResponse = PublicAPIComponents['schemas']['JoinTournamentResponse'];


// Internal API types (game service communication)
export type NewGameRequest = InternalAPIComponents['schemas']['NewGameRequest'];
export type NewGameResponse = InternalAPIComponents['schemas']['NewGameResponse'];
export type NewTournamentGameResponse = InternalAPIComponents['schemas']['NewTournamentGameResponse'];

export interface PlayerStatsAPI {
  wins: number;
  draws: number;
  losses: number;
}

export interface DailyPlayerStatsAPI {
  day: string;
  wins: number;
  draws: number;
  losses: number;
}

export type UserId = number;
export type GameMode = "classic" | "tournament";
export type TournamentId = string | null;
export type GameId = string;
export type GameStatus = "pending" | "ready" | "complete";


export interface Player {
	id: UserId;
	score: number;
}

// for database
export interface GameResultDB {
	id: GameId;
	mode: GameMode;
	tournamentId: string | null;
	winnerId: UserId | null;
	date: Date;
	duration: string;

}

export interface GameParticipationDB {
	userId: UserId;
	score: number;
	result: 'win' | 'loss' | 'draw';
}

export interface TournamentResultDB {
	id: TournamentId;
	semi1Id: GameId;
	semi2Id: GameId;
	finalId: GameId;
	winnerId: UserId;
	date: Date;
}

export interface TournamentParticipationDB {
	tournamentId: TournamentId;
	userId: UserId;
}


// webhook receive / added id for my type
export interface GameResultWebhook {
	id: GameId;
	players: Player[]; //id + score
	winnerId?: UserId | null;
	date: Date;
	duration: string;
}

// for database storage
export interface LocalGameDB {
	id: GameId;
	hostId: UserId;
	date: Date;
	duration: string;
	winnerType?: 'host' | 'guest' | null;
	winnerGuestName?: string;
}

export interface LocalGameParticipantDB {
	position: number; // 1 = host, 2-4 = guests
	guestName?: string;
	score: number;
}

export interface LocalTournamentDB {
	id: string;
	hostId: UserId;
	guest1Name: string;
	guest2Name: string;
	guest3Name: string;
	semi1Id: GameId;
	semi2Id: GameId;
	finalId: GameId;
	winnerType: 'host' | 'guest';
	winnerName: string;
	date: Date;
}

// INTERNAL API TYPES (not in TypeSpec - custom request bodies)
export interface NewTournamentGameRequest {
	nPlayers: number;
	hook?: string;
}

export interface NewTournamentRequest {
	invitedPlayerIds?: UserId[];
}

export interface InviteToTournamentRequest {
	invitedPlayerIds: UserId[];
}

export interface JoinTournamentRequest {
	// No body fields - tournamentId comes from URL params
}

export type TournamentStatus = 'waiting' | 'ready' | 'semi1' | 'semi2' | 'final' | 'complete';
export type TournamentGameStage = 'semi1' | 'semi2' | 'final';

export interface Tournament {
	id: TournamentId;
	hostId: UserId;
	status: TournamentStatus;
	invitedPlayers: UserId[];
	registeredPlayers: UserId[];
	games: {
		semi1?: GameId | null;
		semi2?: GameId | null;
		final?: GameId | null;
	}
	winner?: UserId | null;
	createdAt: Date;
}

export interface TournamentGame {
	id: GameId;
	tournamentId: TournamentId;
	stage: TournamentGameStage;
	status: GameStatus;
	players?: [Player, Player];
	gameKeys?: GameKey[];
	viewingKey?: string;
	createdAt: Date;
	winner?: UserId;
	gameResult?: GameResultWebhook;
}


