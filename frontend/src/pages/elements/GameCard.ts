import { GameResultExt } from "../../Api";
import { AElement, Div, Paragraph } from "./Elements";

const CARD_STYLES: string =
  "flex flex-row p-6 transition duration-200 select-none rounded-xl";

const cardTextFromResult = (r: GameResultExt): string => {
  if (!r.winnerId) {
    return "Draw";
  }
  if (r.winnerId === r.thisUser) {
    return "Victory";
  }
  return "Defeat";
};

const cardBgFromResult = (r: GameResultExt | undefined): string => {
  let outline = "outline-2";
  if (!r) {
    return outline;
  }
  if (!r.thisUser) {
    return outline + " outline-zinc-600 bg-zinc-700/50";
  }
  if (!r.winnerId) {
    return outline + " hover:bg-gray-500/50 outline-gray-500 bg-gray-600/50";
  }
  if (r.winnerId === r.thisUser) {
    return (
      outline + " hover:bg-emerald-600/50 outline-emerald-700 bg-emerald-800/50"
    );
  }
  return outline + " hover:bg-red-700/50 outline-red-800 bg-red-900/50";
};

export class GameCardBase extends Div {
  data?: GameResultExt;

  constructor(data?: GameResultExt) {
    super();
    this.data = data;
    this.class(CARD_STYLES);
    this.class(cardBgFromResult(this.data));
  }
}

export class GameCardLarge extends GameCardBase {
  constructor(data: GameResultExt | undefined) {
    super(data);
    this.class("divide-solid divide-x-2");

    if (!this.data) {
      this.contents = [
        new Paragraph("Loading...").class(
          "font-bold text-xl self-center ml-4 text-zinc-700",
        ),
      ];
      return;
    }

    this.contents = [
      new Div(
        new Paragraph(this.data.date.toLocaleString()).class(
          "font-bold text-xs pr-2",
        ),
        new Paragraph(cardTextFromResult(this.data)).class("font-bold text-xl"),
      ).class("m-2 ml-4 self-center w-40"),
      this.scoreDiv().class("grow"),
    ];
  }

  private scoreDiv(): Div {
    if (!this.data) {
      throw new Error("unreachable");
    }
    const rows: AElement[] = [];
    for (let i = 1; i < this.data.players.length; i++) {
      rows.push(
        new Div(
          new Paragraph(`${this.data.players[i].score}`),
          new Paragraph(`${this.data.players[i].id}`),
        ).class("flex flex-row justify-between gap-2"),
      );
    }
    return new Div(
      new Div(
        new Paragraph(this.data.players[0].id.toString()),
        new Paragraph(`${this.data.players[0].score}`),
      ).class("flex flex-row self-center justify-between grow ml-4 gap-2"),
      new Paragraph(" – ").class("self-center m-3"),
      new Div(...rows).class("self-center grow"),
    ).class("font-bold flex flex-row ml-2 mr-4 grow justify-between") as Div;
  }
}
