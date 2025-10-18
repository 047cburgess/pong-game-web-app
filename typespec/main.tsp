import "@typespec/http";
import "@typespec/rest";

using Http;
@service(#{ title: "ft_transcendence" })
namespace FtTranscendence;

@error
model Error {
  code: int32;
}

model User {
  @key username: string;
  realname?: string;
  avatarUrl?: url;
  lastSeen?: utcDateTime;
  registered: boolean;
}

model UserInfo extends User {
  email: string;
  password: string;
  /* TODO: Anything else? */
}

alias Username = User.username;

@tag("User")
interface Me {
  @route("/me")
  @useAuth(BearerAuth)
  get(): User | UnauthorizedResponse;
}

@tag("User")
@route("/user")
interface UserManagement {
  @route("/oauth2/github")
  oauthGithub(): void;

  @route("/login")
  @post
  login(
    @body userCreds: {
      username: string;
      password: string;
      /* TODO: csrf? */
    },
  ): void | BadRequestResponse;

  @route("/register")
  @post
  register(@body newUserInfo: UserInfo): void | BadRequestResponse;

  @useAuth(BearerAuth)
  @route("/update")
  @patch
  update(
    @body userInfo: MergePatchUpdate<UserInfo>,
  ): void | BadRequestResponse | UnauthorizedResponse;

  @route("/logout")
  @post
  logout(): void;
}

@tag("Users")
@route("/users")
interface Users {
  user(@path username: Username): User | NotFoundResponse;
}

@tag("Friends")
@route("/friends")
interface Friends {
  @doc("Lists friends for a user")
  @get
  list(
    @query
    user: Username,

    @minValue(1)
    @query
    page: uint32 = 1,

    @minValue(1)
    @maxValue(100)
    @query
    per_page: uint32 = 20,
  ): User[] | NotFoundResponse;

  @doc("Lists incoming friend requests for the current user")
  @useAuth(BearerAuth)
  @route("pending")
  @get
  pending(
    @minValue(1)
    @query
    page: uint32 = 1,

    @minValue(1)
    @maxValue(100)
    @query
    per_page: uint32 = 20,
  ): User[] | UnauthorizedResponse;

  @doc("Sends or accepts a friend request")
  @useAuth(BearerAuth)
  @route("add/{username}")
  @post
  add(@path username: Username): void | NotFoundResponse | UnauthorizedResponse;

  @doc("Deletes a friend or rejects a friend request")
  @useAuth(BearerAuth)
  @route("delete/{username}")
  @delete
  delete(
    @path username: Username,
  ): void | NotFoundResponse | UnauthorizedResponse;
}

model Game {
  @key id: string;
  participants: {
    user: User;
    score: uint32;
  };

  @doc("Winner's username, or 'undefined' if the game ended in a draw")
  winner?: Username;

  date: utcDateTime;
  duration: duration;
}

@tag("History")
@route("/history/games")
interface GameHistory {
  @get list(
    @query
    user: Username,

    @minValue(1)
    @query
    page: uint32 = 1,

    @minValue(1)
    @maxValue(25)
    @query
    per_page: uint32 = 15,
  ): Game[] | NotFoundResponse;

  @get game(@path id: Game.id): Game | NotFoundResponse;
}

model Tournament {
  @key id: string;
  games: {
    semifinal1: Game;
    semifinal2: Game;
    final: Game;
  };
}

@tag("History")
@route("/history/tournaments")
interface TournamentHistory {
  @get list(
    @query
    user: Username,

    @minValue(1)
    @query
    page: uint32 = 1,

    @minValue(1)
    @maxValue(25)
    @query
    per_page: uint32 = 15,
  ): Tournament[] | NotFoundResponse;

  @get tournament(@path id: Tournament.id): Tournament | NotFoundResponse;
}

model GameRoom {
  id: string;
}

model GameParams {
  @minValue(2)
  @maxValue(4)
  nPlayers?: uint32 = 2;

  @minValue(16)
  @maxValue(160)
  ballSpeed?: uint32 = 130;

  @minValue(4000)
  @maxValue(60000)
  paddleSize?: uint32 = 17000;

  @minValue(40)
  @maxValue(500)
  paddleSpeed?: uint32 = 320;

  @minValue(0)
  @maxValue(64)
  paddleInertia?: float = 16;

  @minValue(-5)
  @maxValue(5)
  paddleFriction?: float = 1.4;

  @minValue(15000)
  @maxValue(180000)
  timeLimitMs?: uint32 = 120000;

  startingHealth?: uint32;
  pointsTarget?: uint32;
}

@error
model MatchmakeError {
  @statusCode statusCode: 409;
  error: string;
}

@tag("Games")
@route("/games")
@useAuth(BearerAuth)
interface Games {
  @route("/matchmake")
  @post
  matchmake(): void | MatchmakeError | UnauthorizedResponse;

  @route("/custom-game")
  @post
  customGame(@body gameParams?: GameParams):
    | GameRoom
    | MatchmakeError
    | UnauthorizedResponse
    | BadRequestResponse;

  @route("/join")
  @post
  joinRoom(@path id: GameRoom.id):
    | void
    | MatchmakeError
    | NotFoundResponse
    | UnauthorizedResponse;

  @route("/invite")
  @post
  inviteUser(@query username: Username):
    | void
    | MatchmakeError
    | NotFoundResponse
    | UnauthorizedResponse;

  @route("/leave")
  @delete
  leaveRoom(): void | MatchmakeError | UnauthorizedResponse;

  @route("/ready")
  @post
  ready(@query unready?: boolean): void | MatchmakeError | UnauthorizedResponse;

  @route("/reconnect")
  reconnect(): GameRoom | MatchmakeError | UnauthorizedResponse;
}
