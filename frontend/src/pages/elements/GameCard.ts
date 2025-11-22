import { GameResultExt } from "../../Api";
import { APP } from "../../App";
import Router from "../../Router";
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
  constructor(
    data: GameResultExt | undefined,
    protected router: Router,
  ) {
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
      this.scoreDiv(),
    ];
  }

  private scoreDiv(): Div {
    if (!this.data) {
      throw new Error("unreachable");
    }
    const rows: AElement[] = [];
    let thisUserIndex =
      (this.data.thisUser
        && this.data.playerInfos
          .map((x) => x.id)
          .indexOf(this.data?.thisUser ?? 0))
      || 0;
    for (let i = 0; i < this.data.players.length; i++) {
      if (i === thisUserIndex) continue;
      const div = new Div(
        new Paragraph(`${this.data.players[i].score}`),
        new Paragraph(`${this.data.playerInfos[i].username}`),
      ).class("flex flex-row justify-between gap-2") as Div;
      if (this.data.playerInfos[i].id) {
        div
          .withOnclick(() => {
            const username = this.data!.playerInfos[i].username as string;
            let path = "/dashboard";
            if (username !== APP.userInfo?.username) {
              path += "?user=" + username;
            }
            this.router.navigate(path);
          })
          .withId(`game-${this.data!.id}-${i}`)
          .class("hover:text-yellow-200");
      }
      rows.push(div);
    }
    const ownDiv = new Div(
      new Paragraph(this.data.playerInfos[thisUserIndex].username.toString()),
      new Paragraph(`${this.data.players[thisUserIndex].score}`),
    )
      .class(
        "flex flex-row self-center justify-between grow ml-4 gap-2 hover:text-yellow-200",
      )
      .withOnclick(() => {
        const username = this.data!.playerInfos[thisUserIndex]
          .username as string;
        let path = "/dashboard";
        if (username !== APP.userInfo?.username) {
          path += "?user=" + username;
        }
        this.router.navigate(path);
      })
      .withId(`game-${this.data!.id}-${thisUserIndex}`);
    return new Div(
      ownDiv,
      new Paragraph(" – ").class("self-center m-3"),
      new Div(...rows).class("self-center grow"),
    ).class("font-bold flex flex-row ml-2 mr-4 grow justify-between") as Div;
  }
}
