import "@typespec/http";
import "@typespec/rest";

using Http;
using PublicAPI;

@service(#{ title: "Webhooks" })
namespace Webhooks;

model GameResultWebhook {
  @key gameId: string;
  mode: GameMode;

  @minItems(2)
  @maxItems(4)
  players: {
    id: User.Id;
    score: int32;
  }[];

  winnerId?: User.Id;
  date: utcDateTime;
  duration: duration;
}

@tag("Matchmaking Service")
@server("http://matchmaking-service:3000", "Matchmaking")
namespace MatchmakingService {
  @route("webhooks/game-result")
  @doc("For tournament games, a winner must be present.")
  @post
  op gameComplete(@body body: GameResultWebhook): void | BadRequestResponse;
}
