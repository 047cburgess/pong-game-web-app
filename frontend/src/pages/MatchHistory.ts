import { API, GameResultExt, UserInfo } from "../Api";
import { APP, getUsername } from "../App";
import Router, { NavError } from "../Router";
import { Paragraph } from "./elements/Elements";
import { paths as ApiPaths } from "../PublicAPI";
import { userFromMaybeId } from "../Util";
import { EVIL_RED_BUTTON, MUTED_TEXT } from "./elements/CssUtils";
import { GameCardLarge } from "./elements/GameCard";
import AListPage, { titleForUser } from "./AListPage";

export default class MatchHistoryPage extends AListPage {
  username: string;

  games?: GameResultExt[];

  constructor(router: Router) {
    super(
      router,
      "game-hist",
      titleForUser("Match history", getUsername() ?? ""),
    );

    const username = getUsername();
    if (!username) throw new NavError(401);
    this.username = username;
  }

  async loadData(): Promise<void> {
    let path = "/user";
    if (this.username !== APP.userInfo?.username) {
      path = `/users/${this.username}`;
    }

    const resp = await API.fetch(`${path}/games`);

    if (resp.status === 401) {
      APP.onLogout();
      this.router.navigate("/login");
      return;
    }
    if (!resp.ok && resp.status !== 304) {
      this.router.navigate(404, false);
      return;
    }

    const games = (await resp.json().catch(console.error)) as
      | void
      | ApiPaths["/users/{username}/games"]["get"]["responses"]["200"]["content"]["application/json"];

    if (!games) {
      this.setContents([
        new Paragraph(
          "Failure: You failed to fetch match history data. What a disgrace.",
        )
          .class(EVIL_RED_BUTTON)
          .class("text-xl p-4"),
      ]);
      this.redrawList();
      return;
    }

    const ids = new Set(games.flatMap((g) => g.players).map((p) => p.id));
    const userInfos: Map<string | number, UserInfo> = new Map();
    const proms = [];
    for (const id of ids) {
      proms.push(userFromMaybeId(id).then((info) => userInfos.set(id, info)));
    }
    await Promise.all(proms);

    // bad algo but who cares lol
    // we're javascripting this shit
    let currId: null | number = null;
    for (const [id, info] of userInfos) {
      if (typeof id === "number" && info.username === this.username) {
        currId = id;
        break;
      }
    }

    this.games = games.map((_g) => {
      const g = _g as GameResultExt;
      g.playerInfos = g.players.map((p) => userInfos.get(p.id) as UserInfo);
      if (currId) g.thisUser = currId;
      return g;
    });

    if (this.games.length === 0) {
      this.setContents([
        new Paragraph("No recent games")
          .class("text-xl font-bold")
          .class(MUTED_TEXT),
      ]);
    } else {
      this.setContents(this.games.map((g) => new GameCardLarge(g)));
    }

    if (this.router.currentPage !== this) {
      return;
    }

    this.redrawList();
  }
}
