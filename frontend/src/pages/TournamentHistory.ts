import { API, TournamentResultExt, UserInfo } from "../Api";
import { APP, getUsername } from "../App";
import { paths as ApiPaths } from "../PublicAPI";
import Router, { NavError } from "../Router";
import { userFromMaybeId } from "../Util";
import AListPage, { titleForUser } from "./AListPage";
import { EVIL_RED_BUTTON, MUTED_TEXT } from "./elements/CssUtils";
import { Paragraph } from "./elements/Elements";
import TournamentCard from "./elements/TournamentCard";

export default class TournamentHistoryPage extends AListPage {
  username: string;

  tournaments?: TournamentResultExt[];

  constructor(router: Router) {
    super(
      router,
      "tournament-hist",
      titleForUser("Tournament history", getUsername() ?? ""),
    );

    const username = getUsername()!;
    this.username = username;
  }

  async loadData(): Promise<void> {
    let path = "/user";
    if (this.username !== APP.userInfo?.username) {
      path = `/users/${this.username}`;
    }

    const resp = await API.fetch(`${path}/tournaments`);

    if (resp.status === 401) {
      APP.onLogout();
      this.router.navigate("/login");
      return;
    }
    if (!resp.ok && resp.status !== 304) {
      this.router.navigate(404, false);
      return;
    }

    const tournaments = (await resp.json().catch(console.error)) as
      | void
      | ApiPaths["/users/{username}/tournaments"]["get"]["responses"]["200"]["content"]["application/json"];

    if (!tournaments) {
      this.setContents([
        new Paragraph(
          "Failure: You failed to fetch tournament history data. What a disgrace.",
        )
          .class(EVIL_RED_BUTTON)
          .class("text-xl p-4"),
      ]);
      this.redrawList();
      return;
    }

    const ids = new Set(
      tournaments
        .flatMap((t) => [t.games.semifinal1, t.games.semifinal2])
        .flatMap((g) => g.players)
        .map((p) => p.id),
    );
    const userInfos: Map<string | number, UserInfo> = new Map();
    const proms = [];
    for (const id of ids) {
      proms.push(userFromMaybeId(id).then((info) => userInfos.set(id, info)));
    }
    await Promise.all(proms);

    let currId: null | number = null;
    for (const [id, info] of userInfos) {
      if (typeof id === "number" && info.username === this.username) {
        currId = id;
        break;
      }
    }

    this.tournaments = tournaments.map((_t) => {
      const t = _t as TournamentResultExt;
      t.playerInfos = [t.games.semifinal1, t.games.semifinal2]
        .flatMap((g) => g.players)
        .map((p) => userInfos.get(p.id) as UserInfo);
      if (currId) t.thisUser = currId;
      return t;
    });

    if (this.tournaments.length === 0) {
      this.setContents([
        new Paragraph("No recent tournaments")
          .class("text-xl font-bold")
          .class(MUTED_TEXT),
      ]);
    } else {
      this.setContents(this.tournaments.map((x) => new TournamentCard(x)));
    }

    if (this.router.currentPage !== this) {
      return;
    }

    this.redrawList();
  }
}
