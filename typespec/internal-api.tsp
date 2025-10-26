/* TODO: check about protecting internal api routes -> key needed?*/
import "@typespec/http";
import "@typespec/rest";

using Http;
using PublicAPI;

@service(#{ title: "Internal-Only REST APIs" })
namespace InternalApi;

model NewGameRequest {
  @minValue(2)
  @maxValue(4)
  nPlayers: uint32;

  gameMode: GameMode;
}

model NewGameResponse {
  @minItems(2)
  @maxItems(4)
  gameKeys: GameKey[];
}

model GameStatusReponse {
  gameId: string;
  status: "waiting" | "in_progress";
}

@tag("Game Service")
@server("http://game-service:3001", "Game Service")
namespace GameService {
  @doc("Matchingmaking requests new game.")
  @route("/internal/games/create")
  @post
  op newGame(
    @body body: NewGameRequest,
  ): NewGameResponse | BadRequestResponse | UnauthorizedResponse;

  @doc("Matchmaking requesting state of a game -> sanity check.")
  @route("/internal/games/{gameId}/status")
  @get
  op getGameStatus(@path gameId: string): GameStatusReponse | NotFoundResponse;
}
