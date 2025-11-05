export type UserId = number;
export type GameMode = "classic" | "tournament";
export type TournamentId = string | null;
export type GameId = string;
export type GameStatus = "waiting" | "ready" | "started"; // tbc on started if need


export interface Player {
	id: UserId;
	score: number;
}

// GAME TYPES 
export interface GameKey {
	key: string;
	gameId: GameId;
	expires: Date;
}

// openAPI
export interface GameResultAPI {
	id: GameId;
	players: Player[];
	winnerId?: UserId;
	tournamentId?: TournamentId;
	date: Date;
	duration: string;
}

export interface TournamentResultAPI {
  id: TournamentId;
  date: Date;
  participants: {
    id: UserId;
  }[];
  games: {
    semifinal1: GameResultAPI;
    semifinal2: GameResultAPI;
    final: GameResultAPI;
  };
}

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

// combined stats response matching TypeSpec
export interface GameStatsAPI {
  lifetime: PlayerStatsAPI;
  daily: DailyPlayerStatsAPI[];
  recentMatches: GameResultAPI[];
  recentTournaments: TournamentResultAPI[];
}	

// for database
export interface GameResultDB {
	id: GameId;
	mode: GameMode;
	//is_local: boolean;
	tournamentId?: string;
	winnerId?: string;
	date: Date;
	duration: string;

}

export interface GameParticipationDB {
	userId: UserId;
	score: number;
	result: 'win' | 'loss' | 'draw'
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


// webhook receive
export interface GameResultWebhook {
	id: GameId;
	players: Player[]; //id + score
	winnerId?: string;
	date: Date;
	duration: string;
}

// LOCAL GAME TYPES
export interface LocalGameSubmission {
	gameId: GameId; // from game service
	players: {
		id: UserId | string; // UserId for host, string for guests
		score: number;
	}[];
	winnerId?: UserId | string;
	duration: string;
}

export interface LocalTournamentSubmission {
	// NO tournamentId - backend generates it
	participants: {
		id: UserId | string;
	}[];
	games: {
		semifinal1: LocalGameSubmission;
		semifinal2: LocalGameSubmission;
		final: LocalGameSubmission;
	};
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

// SSE EVENT TYPES - outgoing
export interface GameInviteEvent {
	id?: string;
	event: "GameInvite";
	gameId: GameId;
	from: UserId;
}

export interface TournamentInviteEvent {
	id?: string;
	event: "TournamentInvite";
	tournamentId: TournamentId;
	from: UserId;
}



export interface CustomGame {
	gameId: GameId;
	hostId: UserId;
	capacity: number;
	invitedPlayers: UserId[];
	acceptedPlayers?:UserId[];
	keys: GameKey[]; // same number as max players/capacity
	status: GameStatus;
	createdAt: Date;
}

// INTERNAL API TYPES (requests to game service)
// gameMode is omitted - derived from endpoint path
export interface NewGameRequest {
	nPlayers: number;
}

export interface NewGameResponse {
	gameKeys: GameKey[];
}

export interface NewTournamentGameRequest {
	nPlayers: number;
}

export interface NewTournamentGameResponse {
	gameKeys: GameKey[];
	viewingKey: string;
}

// Tournament API Req/Res
export interface NewTournamentRequest {
	invitedPlayers?: UserId[];
}

export interface NewTournamentResponse {
	tournamentId: TournamentId;
	invitedPlayers: UserId[];
}

export interface InviteToTournamentRequest {
	tournamentId: TournamentId;
	toInvite: UserId[];
}

export interface InviteToTournamentResponse {
	tournamentId: TournamentId;
	invitedPlayers: UserId[];
}

export interface JoinTournamentRequest {
	tournamentId: TournamentId;
}

export interface JoinTournamentResponse {
	tournamentId: TournamentId;
}

export type TournamentStatus = 'waiting' | 'ready' | 'semi1' | 'semi2' | 'final' | 'complete';
export type TournamentGameStatus = 'pending' | 'ready' | 'complete';

export interface Tournament {
	id: TournamentId;
	hostId: UserId;
	status: TournamentStatus;
	invitedPlayers: UserId[];
	registeredPlayers: UserId[];
	games: {
		semi1?: GameId;
		semi2?: GameId;
		final?: GameId;
	}
	winner?: UserId;
	createdAt: Date;
}

export interface TournamentStatusAPI {
	tournamentId: TournamentId;
	status: TournamentStatus;
	registeredPlayers: UserId[];
	games: {
		semi1: {
			id?: GameId;
			status: TournamentGameStatus;
			players: Player[];
			winner?: UserId;
		};
		semi2: {
			id?: GameId;
			status: TournamentGameStatus;
			players: Player[];
			winner?: UserId;
		};
		final: {
			id?: GameId;
			status: TournamentGameStatus;
			players: Player[];
			winner?: UserId;
		};
	};
}

export interface TournamentGame {
	id: GameId;
	tournamentId: TournamentId;
	stage: 'semi1' | 'semi2' | 'final';
	status: GameStatus;
	players?: [Player, Player];
	gameKeys?: GameKey[];
	viewingKey?: string;
	createdAt: Date;
	winner?: UserId;
	gameResult?: GameResultWebhook;
}


