import "@typespec/http";
import "@typespec/rest";
import "@typespec/streams";

using Http;
@service(#{ title: "FtTranscendence" })
namespace FtTranscendence;

model Game {
  @key id: string;
  players: {
    id: User.Id | string;
    score: int32;
  }[];

  @doc("Username of the winner or `undefined` if draw")
  winner?: User.Id | string;

  tournamentId?: TournamentId;

  date: utcDateTime;
  duration: duration;
}

alias TournamentId = string;

model Tournament {
  @key id: TournamentId;
  createdAt: utcDateTime;
  participants: {
	id: User.Id | string;
	}[];
  games: {
    semifinal1: Game;
    semifinal2: Game;
    final: Game;
  };
}

model GameStats {
  lifetime: {
    wins: uint32;
    draws: uint32;
    losses: uint32;
  };
  daily: {
    wins: uint32;
    draws: uint32;
    losses: uint32;
    day: plainDate;
  }[];
  recentMatches: Game[];
  recentTournaments: Tournament[];
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
  ): Game[] | NotModifiedResponse | NotFoundResponse | UnauthorizedResponse;

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
    | Tournament[]
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
    @doc("Game stats for the current user")
    @route("stats")
    @get
    stats(): GameStats | NotModifiedResponse | UnauthorizedResponse;

    @doc("Match history for the current user")
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
    ): Game[] | NotModifiedResponse | UnauthorizedResponse;

    @doc("Tournament history for the current user")
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
    ): Tournament[] | NotModifiedResponse | UnauthorizedResponse;
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

  @route("create")
  @post
  create(
    @body body: {
      @minValue(2)
      @maxValue(4)
      numberOfPlayers: uint32;

      playerAliases?: string[];
      invitedPlayerIds?: User.Id[];
    },
  ): GameKey | BadRequestResponse | UnauthorizedResponse;
}

@tag("Tournaments")
@route("/tournaments")
interface Tournaments {
  @route("create")
  @post
  createTournament(
    @body body: {
      playerAliases?: string[];
      invitedPlayerIds?: User.Id[];
    },
  ): void /* TODO */ | BadRequestResponse | UnauthorizedResponse;

  @route("{tournamentId}/join")
  @post
  joinTournament(
    @path tournamentId: string,
  ): void /* TODO */ | UnauthorizedResponse | NotFoundResponse;
}

model GameInvite {
  id?: string;
  event: "GameInvite";
  from: Username;
  roomId: string;
}

model FriendRequest {
  id?: string;
  event: "FriendRequest";
  from: Username;
}

alias ServerMessage = GameInvite | FriendRequest;

@tag("Events")
@useAuth(BearerAuth)
interface Events {
  @doc("SSE endpoint")
  @route("/events")
  @get
  events(): Streams.Stream<ServerMessage> | UnauthorizedResponse;
}
