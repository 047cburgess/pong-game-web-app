import { components as ApiComponents } from "./PublicAPI";

class ApiAccessor {
  baseRoute: string;

  constructor(baseRoute: string) {
    this.baseRoute = baseRoute;
  }

  async fetch(input: RequestInfo | URL) {
    if (input && typeof input === "string" && input[0] !== "/") {
      input = "/" + input;
    }
    return await fetch(this.baseRoute + input);
  }
}

export const API = new ApiAccessor("/api/v1");

export type ApiSchemas = ApiComponents["schemas"];

export type InfoExt = { playerInfos: UserInfo[]; thisUser?: number };

export type GameResult = ApiSchemas["GameResult"];
export type GameResultExt = GameResult & InfoExt;
export type GameStats = ApiSchemas["GameStats"];
export type UserInfo = ApiSchemas["User.PublicInfo"];
export type SelfInfo = ApiSchemas["User.PublicInfo"]
  & ApiSchemas["User.PrivateInfo"];
export type TournamentResult = ApiSchemas["TournamentResult"];
export type TournamentResultExt = ApiSchemas["TournamentResult"] & InfoExt;
