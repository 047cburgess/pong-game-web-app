import "@typespec/http";
import "@typespec/rest";
import "@typespec/streams";

using Http;
@service(#{ title: "Public API" })
namespace PublicAPI;

model GameResult {
  @key id: string;

  @minItems(2)
  @maxItems(4)
  players: {
    id: User.Id | string;
    score: int32;
  }[];

  @doc("Username of the winner or `undefined` if draw")
  winnerId?: User.Id | string;

  tournamentId?: TournamentId;
  date: utcDateTime;
  duration: duration;
}

alias TournamentId = string;
alias GameMode = "classic" | "tournament";

model TournamentResult {
  @key id: TournamentId;
  date: utcDateTime;

  @minItems(4)
  @maxItems(4)
  participants: {
    id: User.Id | string;
  }[];

  games: {
    semifinal1: GameResult;
    semifinal2: GameResult;
    final: GameResult;
  };
}

model GameStats {
  lifetime: {
    wins: uint32;
    draws: uint32;
    losses: uint32;
  };

  @maxItems(7)
  daily: {
    wins: uint32;
    draws: uint32;
    losses: uint32;
    day: plainDate;
  }[];

  @maxItems(5)
  recentMatches: GameResult[];

  @maxItems(5)
  recentTournaments: TournamentResult[];
}

@route("/users")
@useAuth(BearerAuth)
interface Users {
  @tag("Users")
  @get
  user(@path username: Username):
    | User.PublicInfo
    | NotModifiedResponse
    | NotFoundResponse
    | UnauthorizedResponse;

  @tag("Friends")
  @route("{username}/friends")
  @get
  friends(@path username: Username | User.Id):
    | User.PublicInfo[]
    | NotModifiedResponse
    | NotFoundResponse
    | UnauthorizedResponse;

  @tag("Game Stats")
  @route("{username}/stats")
  @get
  stats(@path username: Username):
    | GameStats
    | NotModifiedResponse
    | NotFoundResponse
    | UnauthorizedResponse;

  @tag("Game Stats")
  @route("{username}/games")
  @get
  games(
    @path username: Username,

    @minValue(1)
    @query
    page: uint32 = 1,

    @minValue(1)
    @maxValue(100)
    @query
    per_page: uint32 = 25,
  ):
    | GameResult[]
    | NotModifiedResponse
    | NotFoundResponse
    | UnauthorizedResponse;

  @tag("Game Stats")
  @route("{username}/tournaments")
  @get
  tournaments(
    @path username: Username,

    @minValue(1)
    @query
    page: uint32 = 1,

    @minValue(1)
    @maxValue(50)
    @query
    per_page: uint32 = 20,
  ):
    | TournamentResult[]
    | NotModifiedResponse
    | NotFoundResponse
    | UnauthorizedResponse;
}
alias Username = User.Username;

@route("/user")
namespace User {
  alias Username = string;
  alias Id = uint64;

  @doc("Public facing info that can be mutated by the user")
  model MutablePublicInfo {
    username: Username;
    realname?: string;
    avatarUrl?: url;
  }

  model PublicInfo extends MutablePublicInfo {
    @doc("id = 0 is reserved for non-registered users")
    @key
    id: Id;

    lastSeen?: utcDateTime;
    registeredSince?: utcDateTime;
  }

  model PrivateInfo {
    email: string;
  }

  alias UserInfoReg = MutablePublicInfo &
    PrivateInfo & {
      password: string;
    };
  alias UserInfoPatch = MergePatchUpdate<UserInfoReg>;

  @tag("Users")
  @useAuth(BearerAuth)
  interface User {
    @get
    get(): (PublicInfo &
      PrivateInfo) | NotModifiedResponse | UnauthorizedResponse;

    @patch
    update(
      @body body: UserInfoPatch,
    ): void | BadRequestResponse | UnauthorizedResponse;

    @delete
    delete(): void | UnauthorizedResponse;
  }

  @tag("Auth")
  interface Auth {
    @route("login")
    @post
    login(
      @body body: {
        username: Username;
        password: string;
      },
    ):
      | void
      | {
          status: "2fa_required";
        }
      | BadRequestResponse
      | UnauthorizedResponse;

    @route("login/two-factor")
    @post
    twoFactor(
      @body body: {
        token: string;
      },
    ): void | BadRequestResponse | UnauthorizedResponse;

    @route("logout")
    @post
    logout(): void | UnauthorizedResponse;

    @route("register")
    @post
    register(
      @body body: UserInfoReg,
    ): void | BadRequestResponse | ConflictResponse;

    @route("oauth/github")
    @get
    oauthGithub(): void;
  }

  @tag("Friends")
  @useAuth(BearerAuth)
  @route("/friends")
  interface Friends {
    @doc("List friends of the current user")
    @get
    list(): PublicInfo[] | NotModifiedResponse | UnauthorizedResponse;

    @doc("Check friendship state between the current user and the target")
    @get
    state(@path username: Username):
      | {
          state: "friends" | "outgoing" | "incoming";
        }
      | NotModifiedResponse
      | UnauthorizedResponse
      | NotFoundResponse;

    @doc("Remove a friend")
    @delete
    delete(
      @path username: Username,
    ): void | NotFoundResponse | UnauthorizedResponse;
  }

  @tag("Friends")
  @useAuth(BearerAuth)
  @route("/friends/requests")
  interface FriendRequests {
    @doc("List incoming friend requests")
    @get
    list(): PublicInfo[] | NotModifiedResponse | UnauthorizedResponse;

    @doc("Accept a friend request")
    @put
    accept(@path username: Username):
      | void
      | UnauthorizedResponse
      | NotFoundResponse
      | ConflictResponse;

    @doc("Reject a friend request from the target user")
    @delete
    reject(
      @path username: Username,
    ): void | UnauthorizedResponse | NotFoundResponse;

    @doc("List outgoing friend requests")
    @route("outgoing")
    @get
    listOutgoing(): PublicInfo[] | NotModifiedResponse | UnauthorizedResponse;

    @doc("Send a friend request")
    @route("outgoing")
    @put
    send(@path username: Username):
      | void
      | UnauthorizedResponse
      | NotFoundResponse
      | ConflictResponse;

    @doc("Cancel an outgoing friend request")
    @route("outgoing")
    @delete
    cancel(
      @path username: Username,
    ): void | UnauthorizedResponse | NotFoundResponse;
  }

  @tag("Game Stats")
  @useAuth(BearerAuth)
  interface History {
    @doc("Get Game stats for the current user")
    @route("stats")
    @get
    stats(): GameStats | NotModifiedResponse | UnauthorizedResponse;

    @doc("Get Match history for the current user")
    @route("games")
    @get
    games(
      @minValue(1)
      @query
      page: uint32 = 1,

      @minValue(1)
      @maxValue(100)
      @query
      per_page: uint32 = 25,
    ): GameResult[] | NotModifiedResponse | UnauthorizedResponse;

    @doc("Get Tournament history for the current user")
    @route("tournaments")
    @get
    tournaments(
      @minValue(1)
      @query
      page: uint32 = 1,

      @minValue(1)
      @maxValue(100)
      @query
      per_page: uint32 = 25,
    ): TournamentResult[] | NotModifiedResponse | UnauthorizedResponse;

    @doc("Submit local game result from front end")
    @route("games/local")
    @post
    submitGame(
      @body body: LocalGameSubmission,
    ): void | BadRequestResponse | UnauthorizedResponse;

    @doc("Submit local tournament result from front end")
    @route("tournaments/local")
    @post
    submitTournament(
      @body body: LocalTournamentSubmission,
    ): void | BadRequestResponse | UnauthorizedResponse;
  }
}

/**
 * `GameKey` is returned by all the endpoints that are opening game websocket connection.
 * Since the websocket endpoint cannot have body,
 * `GameKey` will be the first message send via the newly established websocket"
 */
model GameKey {
  key: string;
  gameId: string;
  expires: utcDateTime;
}

@doc("Endpoints for creating/joining games. See `GameKey` for more details")
@tag("Games")
@route("/games")
@useAuth(BearerAuth)
interface Games {
  @route("queue")
  @post
  queue(): GameKey | UnauthorizedResponse;
  @doc("Online custom game request going to MM service. Body contains players that matchmaking service will invite via SSE.")
  @route("create")
  @post
  create(
    @body body: {
      @minValue(2)
      @maxValue(4)
      @doc("Capacity of the game. Host can invite as many as they like but starts when full.")
      numberOfPlayers: uint32;

      invitedPlayerIds: User.Id[];
    },
  ): GameKey | BadRequestResponse | UnauthorizedResponse;


  @doc("Invite players to a custom game - if not included in the initial create request.")
  @route("{gameId}/invite")
  @post
  invitePlayers(
    @path gameId: string,
    @body body: {
	    invitedPlayerIds: User.Id[];
    },
   ): InviteGameResponse | BadRequestResponse | UnauthorizedResponse | NotFoundResponse | ConflictResponse;

  /* Leaving the accept / decline for game invites as will be helpful for token management in the back end as tokens are limited to number of players. */
  @doc("Accept game invitation and receive token for WebSocket connection to game server.")
  @route("{gameId}/join")
  @post
  join(@path gameId: string):
    | GameKey
    | ConflictResponse
    | NotFoundResponse
    | UnauthorizedResponse;

  @doc("Decline game invitation.")
  @route("{gameId}/decline")
  @delete
  decline(@path gameId: string): void | NotFoundResponse | UnauthorizedResponse;

  @doc("Get viewing key for tournament game (spectator mode).")
  @route("{gameId}/view")
  @post
  view(@path gameId: string):
    | {
        viewingKey: string;
        gameId: GameId;
      }
    | UnauthorizedResponse
    | ForbiddenResponse
    | NotFoundResponse
    | ConflictResponse;
}

model CreateTournamentResponse {
  tournamentId: TournamentId;
  invitedPlayers: User.Id[];
}

model JoinTournamentResponse {
  tournamentId: TournamentId;
}

model InviteTournamentResponse {
  tournamentId: TournamentId;
  invitedPlayers: User.Id[];
}

model InviteGameResponse {
  gameId: GameId;
  invitedPlayers: User.Id[];
}

model InviteGameRequest {
   gameId: GameId;
   invitedPlayerIds: User.Id[];
}

model TournamentGameStatus {
  id?: GameId;
  status: "pending" | "ready" | "complete";
  players: {
    id: User.Id;
    score: uint32;
  }[];
  winner?: User.Id;
}

model TournamentStatusResponse {
  tournamentId: TournamentId;
  status: "waiting" | "ready" | "semi1" | "semi2" | "final" | "complete" | "abandoned";
  registeredPlayers: User.Id[];
  games: {
    semi1: TournamentGameStatus;
    semi2: TournamentGameStatus;
    final: TournamentGameStatus;
  };
  winner?: User.Id;
}

alias GameId = string;

model LocalGameSubmission {
  gameId: GameId;
  @minItems(2)
  @maxItems(4)
  players: {
    id: User.Id | string;
    score: uint32;
  }[];

  winnerId?: User.Id | string;
  duration: duration;
}

model LocalTournamentSubmission {
  @minItems(4)
  @maxItems(4)
  participants: {
    id: User.Id | string;
  }[];

  games: {
    semifinal1: LocalGameSubmission;
    semifinal2: LocalGameSubmission;
    final: LocalGameSubmission;
  };
}

@doc("Endpoints for saving local games.")
@tag("Local Games")
@route("/games/local")
@useAuth(BearerAuth)
interface LocalGames {
	@post
	saveGame(
	@body body: LocalGameSubmission;
	): void | ConflictResponse | BadRequestResponse | UnauthorizedResponse;
}

@doc("Endpoints for saving local tournamnets.")
@tag("Local Tournaments")
@route("/tournaments/local")
@useAuth(BearerAuth)
interface LocalTournaments {
	@post
	saveTournament(
	@body body: LocalTournamentSubmission;
	): void | BadRequestResponse | UnauthorizedResponse | ConflictResponse | ForbiddenResponse
}

@doc("Endpoints for online tournaments with registered users.")
@tag("Tournaments")
@route("/tournaments")
@useAuth(BearerAuth)
interface Tournaments {
  @doc("Create a new online tournament. Host can invite any number of players. Host is automatically registered. Tournament starts when 4 players total are registered (first come, first served).")
  @route("create")
  @post
  createTournament(
    @body body: {
      invitedPlayerIds?: User.Id[];
    },
  ): CreateTournamentResponse | BadRequestResponse | UnauthorizedResponse;

  @doc("Invite additional players to tournament. Only host can invite. Returns list of players who received SSE notifications.")
  @route("{tournamentId}/invite")
  @post
  invitePlayers(
    @path tournamentId: string,
    @body body: {
      invitedPlayerIds: User.Id[];
    },
  ):
    | InviteTournamentResponse
    | BadRequestResponse
    | UnauthorizedResponse
    | ForbiddenResponse
    | NotFoundResponse
    | ConflictResponse;

  @doc("Accept tournament invitation and register. Tournament starts when 4 players registered.")
  @route("{tournamentId}/join")
  @post
  joinTournament(@path tournamentId: string):
    | JoinTournamentResponse
    | UnauthorizedResponse
    | ForbiddenResponse
    | NotFoundResponse
    | ConflictResponse;

  @doc("Decline tournament invitation.")
  @route("{tournamentId}/decline")
  @delete
  declineTournament(@path tournamentId: string):
    | void
    | UnauthorizedResponse
    | ForbiddenResponse
    | NotFoundResponse
    | ConflictResponse;

  @doc("Get tournament status including registered players and game states. Poll this to know when games are ready. Use /games/:gameId/join to join game or /games/:gameId/view to spectate.")
  @route("{tournamentId}/status")
  @get
  getStatus(@path tournamentId: string):
    | TournamentStatusResponse
    | UnauthorizedResponse
    | ForbiddenResponse
    | NotFoundResponse;
}

/* SSE models */
/* WILL NEED RESPONSE OTHERWISE WONT HAVE THE RIGHT NUMBER OF TOKENS IF INVITING MANY*/
model GameInvite {
  id?: string;
  event: "GameInvite";
  gameId: string;
  from: User.Id;
}

model TournamentInvite {
  id?: string;
  event: "TournamentInvite";
  tournamentId: string;
  from: User.Id;
}

model FriendRequest {
  id?: string;
  event: "FriendRequest";
  from: Username;
}

// TDB for other matchmaking SSE.
alias ServerMessage = GameInvite | TournamentInvite | FriendRequest;

@tag("Events")
@useAuth(BearerAuth)
interface Events {
  @doc("SSE endpoint")
  @route("/events")
  @get
  events(): Streams.Stream<ServerMessage> | UnauthorizedResponse;
}
