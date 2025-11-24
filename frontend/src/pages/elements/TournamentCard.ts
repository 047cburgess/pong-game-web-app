import { TournamentResultExt } from "../../Api";
import { Div } from "./Elements";

const cardStylesFromData = (data: TournamentResultExt): string => {
  if (!data.thisUser) {
    return "TODO";
  }
  if (data.games.final.winnerId === data.thisUser) {
    return "TODO W";
  }
  return "TODO L";
};

// TODO(Vaiva): Tournament cards
export default class TournamentCard extends Div {
  data: TournamentResultExt;

  constructor(data: TournamentResultExt) {
    super();
    this.data = data;
  }
}
