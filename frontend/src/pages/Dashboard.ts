import { API, GameResultExt, GameStats, UserInfo } from "../Api";
import { APP } from "../App";
import Router, { NavError, Page } from "../Router";
import {
  AVATAR_DIV,
  DEFAULT_BUTTON,
  HOW_TO_CENTER_A_DIV,
  MUTED_TEXT,
  OFFLINE_GRAY,
  ONLINE_GREEN,
} from "./elements/CssUtils";
import { AElement, Div, Image, Inline, Paragraph } from "./elements/Elements";
import { GameCardBase, GameCardLarge } from "./elements/GameCard";
import {
  ICON_ADD_FRIEND,
  ICON_CROSSED_SWORDS,
  ICON_FRIEND_ADDED,
} from "./elements/SvgIcons";
import { paths as ApiPaths } from "../PublicAPI";
import { userFromMaybeId } from "../Util";

const TILE_ANIM_KEY1 = ["opacity-0"];
const TILE_ANIM_KEY2 = ["opacity-100"];

const TILE_STYLES: string = "outline-0 rounded-xl outline-neutral-700 p-4";

export default class DashboardPage extends Page {
  readonly username: string;

  friendState?: "self" | "friend" | "outgoing" | "incoming" | null;

  userInfo?: UserInfo;
  stats?: GameStats;
  friends?: UserInfo[];

  recentGames?: GameResultExt[];

  tiles?: Div[];

  constructor(router: Router) {
    super(router);

    let username = new URLSearchParams(location.search).get("user");
    if (!username) {
      username = APP.userInfo?.username ?? null;
    }
    if (!username) {
      throw new NavError(401);
    }
    this.username = username;

    if (username === APP.userInfo?.username) {
      this.friendState = "self";
    }
  }

  content(): AElement[] {
    const sideLeft = [
      this.userInfoTile().class(TILE_STYLES),
      this.friendsTile().class(TILE_STYLES),
    ];
    const sideRight = [
      this.matchHistoryTile().class(TILE_STYLES),
      // TODO(Vaiva): Last tournament
    ];

    delete this.tiles;
    this.tiles = sideLeft.concat(sideRight) as Div[];

    for (let i = 0; i < this.tiles.length; i++) {
      if (!this.tiles[i].id) {
        this.tiles[i].id = `tile-anim-${i}`;
      }
    }

    return [
      new Div(
        new Div(...sideLeft).class(
          "flex flex-col grow lg:max-w-100 gap-2 md:gap-4",
        ),
        new Div(...sideRight).class(
          "col-span-2 flex flex-col grow lg:max-w-200 gap-2 md:gap-4",
        ),
      )
        .class("gap-2 p-12 min-w-120 max-w-300")
        .class("grid grid-cols-3 ml-auto mr-auto md:gap-4"),
    ];
  }

  userInfoTile(): Div {
    let onlineStatus = new Paragraph("Offline")
      .class("col-span-2")
      .class(OFFLINE_GRAY);
    const lastSeen =
      this.userInfo?.lastSeen ? Date.parse(this.userInfo.lastSeen) : 0;
    if (lastSeen + 4 * 60_000 > Date.now()) {
      onlineStatus = new Paragraph("Online")
        .class("col-span-2")
        .class(ONLINE_GREEN);
    }

    const registeredSince =
      this.userInfo?.registeredSince ?
        Date.parse(this.userInfo.registeredSince).toLocaleString()
      : "...";

    const interactButtons: AElement[] = this.interactButtons();

    return new Div(
      new Div(new Image("/api/v1/user/avatars/" + this.username + ".webp"))
        .class("text-zinc-700/10 bg-zinc-800 mb-4 col-span-2")
        .class(AVATAR_DIV),
      new Div(new Paragraph(this.username).class("font-bold")).class(
        "flex flex-row gap-2 text-3xl mb-4 col-span-2",
      ),
      ...interactButtons,
      onlineStatus,
      new Paragraph("Member since:"),
      new Paragraph(registeredSince).class("text-right font-bold self-end"),
      new Paragraph("Games played:"),
      (this.stats ?
        new Paragraph(
          `${
            this.stats.lifetime.wins
            + this.stats.lifetime.losses
            + this.stats.lifetime.draws
          }`,
        )
      : new Paragraph("...")
      ).class("text-right font-bold self-end"),
      new Paragraph("Rank:"),
      new Paragraph("Gamer").class("text-right font-bold self-end"),
    )
      .class("grid grid-cols-2")
      .withId("tile-user-info") as Div;
  }

  friendsTile(): Div {
    const friendCard = (info: UserInfo, index: number): AElement => {
      const elems = [
        (info.avatarUrl ? new Div(new Image(info.avatarUrl)) : new Div())
          .class("w-8 bg-cyan-200")
          .class(AVATAR_DIV),
        new Div().class(
          "h-3 w-3 rounded-full -ml-6.75 mt-4.5 outline-2 outline-neutral-900",
        ),
        new Paragraph(info.username).class("self-center font-bold"),
      ];
      if (
        info.lastSeen
        && Date.parse(info.lastSeen) + 4 * 60_000 > Date.now()
      ) {
        elems[1].class("bg-green-400");
      } else {
        elems[1].class("bg-neutral-400");
      }
      const res = new Div(...elems)
        .class(
          "transition duration-150 ease-in-out flex flex-row gap-4 hover:bg-zinc-800 rounded-xl",
        )
        .withId(`friend-${index}`)
        .withOnclick(() =>
          this.router.navigate(`/dashboard?user=${info.username}`),
        );
      return res;
    };

    let flist: AElement[];
    if (this.friends?.length) {
      flist = this.friends.slice(0, 5).map(friendCard);
    } else if (this.friends === undefined) {
      flist = [];
      for (let i = 0; i < 5; i++) {
        flist.push(
          (() => {
            const elems = [
              new Div().class(
                "aspect-square w-8 bg-neutral-800/50 rounded-full",
              ),
              new Div().class(
                "h-3 w-3 rounded-full -ml-6.75 mt-4.5 outline-2 outline-neutral-900",
              ),
              new Paragraph("•••").class(
                "self-center font-bold text-neutral-700",
              ),
            ];
            elems[1].class("bg-neutral-400/10");
            const res = new Div(...elems).class(
              "transition duration-150 ease-in-out flex flex-row gap-4 hover:bg-zinc-800 rounded-xl",
            );
            return res;
          })(),
        );
      }
    } else {
      flist = [new Paragraph("No frens found :(").class(MUTED_TEXT)];
    }

    const friendsTitle = new Div(
      new Paragraph("Friends →"),
      new Paragraph(`${this.friends?.length ?? "..."}`),
    )
      .class("flex justify-between font-bold text-xl mb-2")
      .withId("friends-list-title")
      .withOnclick(() => this.router.navigate("/friends" + location.search));

    return new Div(friendsTitle, ...flist)
      .class("flex flex-col gap-2 select-none")
      .withId("tile-friends") as Div;
  }

  matchHistoryTile(): Div {
    const cards = [];
    if (!this.recentGames) {
      for (let i = 0; i < 5; i++) {
        const c = new GameCardBase() as Div;
        c.contents = [new Paragraph("Loading...").class("self-center")];
        c.class("outline-neutral-800 text-neutral-700 text-xl font-bold");
        cards.push(c);
      }
    } else if (this.recentGames.length === 0) {
      const c = new GameCardBase() as Div;
      c.contents = [
        new Paragraph("No recent games").class("self-center").class(MUTED_TEXT),
      ];
      c.class("outline-neutral-700 bg-zinc-800/75 text-xl font-bold");
      cards.push(c);
    } else {
      for (let i = 0; i < Math.min(5, this.recentGames.length); i++) {
        const gg = this.recentGames[i];
        cards.push(
          new GameCardLarge(gg)
            .withOnclick(() => this.router.navigate(`/games?id=${gg.id}`))
            .withId(`game-card-${i}`),
        );
      }
    }
    for (const c of cards) {
      c.class("h-32");
    }

    const navGameHistory = () => {
      this.router.navigate("/game-history" + location.search);
    };
    const historyTitle = new Paragraph("Match history&nbsp;→")
      .class("select-none")
      .withOnclick(navGameHistory)
      .withId("match-history") as Paragraph;

    let seeAll: AElement = new Inline();
    if (this.recentGames?.length !== 0) {
      seeAll = new GameCardBase()
        .class(DEFAULT_BUTTON)
        .class(HOW_TO_CENTER_A_DIV)
        .class("h-10")
        .withOnclick(navGameHistory)
        .withId("see-all-btn");
      (seeAll as Div).contents = [
        new Paragraph("See all").class("self-center font-bold"),
      ];
    }

    let stats = new Div(
      new Paragraph(
        `Wins: <span class="text-white">${this.stats?.lifetime.wins ?? ".."}</span>`,
      ),
      new Paragraph(
        `Draws: <span class="text-white">${this.stats?.lifetime.losses ?? ".."}</span>`,
      ),
      new Paragraph(
        `Losses: <span class="text-white">${this.stats?.lifetime.draws ?? ".."}</span>`,
      ),
    );
    return new Div(
      new Div(
        historyTitle,
        stats.class(
          "hidden md:flex flex-row justify-end gap-4 text-neutral-500",
        ),
      ).class("flex flex-row gap-4 justify-between font-bold text-xl mb-2"),
      ...cards,
      seeAll,
    )
      .class("flex flex-col gap-2 md:gap-4")
      .withId("tile-match-history") as Div;
  }

  bindEvents() {
    if (!APP.userInfo) {
      this.router.navigate("/login");
    }

    this.tiles?.forEach((tile) => tile.bindEvents());

    let path = "/user";
    if (this.username !== APP.userInfo?.username) {
      path = `/users/${this.username}`;
    }
  }

  interactButtons(): AElement[] {
    // TODO(Vaiva): Dashboard page buttons

    const styles = "flex gap-2 font-bold p-1 pl-4 pr-4 -mt-1 mb-3";

    let buttons: AElement[] = [];

    switch (this.friendState) {
      case null:
      case "incoming":
        buttons = [
          new Div(
            new Inline(ICON_ADD_FRIEND).class("self-center"),
            new Paragraph("Add friend").class("self-center"),
          )
            .class("grow")
            .class(HOW_TO_CENTER_A_DIV)
            .class(styles)
            .class(DEFAULT_BUTTON)
            .withId("add-friend-btn"),
          new Div(new Inline(ICON_CROSSED_SWORDS).class("self-center"))
            .class(HOW_TO_CENTER_A_DIV)
            .class(styles)
            .class(DEFAULT_BUTTON)
            .withId("invite-to-play-btn"),
        ];
        break;
      case "self":
        buttons = [
          new Div(
            // todo: setting button icon
            new Paragraph("Edit profile").class("self-center"),
          )
            .class("grow")
            .class(HOW_TO_CENTER_A_DIV)
            .class(styles)
            .class(DEFAULT_BUTTON)
            .withOnclick(() => this.router.navigate("/settings"))
            .withId("edit-profile-btn"),
        ];
        break;
      case "outgoing":
        buttons = [
          new Div(
            new Inline(ICON_FRIEND_ADDED).class("self-center"),
            new Paragraph("Request sent").class("self-center"),
          )
            .class("grow")
            .class(HOW_TO_CENTER_A_DIV)
            .class(styles)
            .class(DEFAULT_BUTTON)
            .withId("cancel-friend-req-btn"),
          new Div(new Inline(ICON_CROSSED_SWORDS).class("self-center"))
            .class(HOW_TO_CENTER_A_DIV)
            .class(styles)
            .class(DEFAULT_BUTTON)
            .withId("invite-to-play-btn"),
        ];
        break;
      case undefined:
      case "friend":
        buttons = [
          new Div(
            new Inline(ICON_CROSSED_SWORDS).class("self-center"),
            new Paragraph("Invite to play").class("self-center"),
          )
            .class("grow")
            .class(HOW_TO_CENTER_A_DIV)
            .class(styles)
            .class(DEFAULT_BUTTON)
            .withId("invite-to-play-btn"),
          new Div(new Inline(ICON_FRIEND_ADDED).class("self-center"))
            .class(HOW_TO_CENTER_A_DIV)
            .class(styles)
            .class(DEFAULT_BUTTON)
            .withId("remove-friend-btn"),
        ];
        break;
    }

    return [new Div(...buttons).class("col-span-2 flex gap-4")];
  }

  transitionIn(): null | void {
    [
      "delay-25",
      "delay-50",
      "delay-75",
      "delay-100",
      "delay-200",
      "delay-300",
      "delay-125",
      "delay-225",
      "delay-325",
      "delay-150",
      "delay-250",
      "delay-350",
      "delay-175",
      "delay-275",
      "delay-375",
    ];

    this.tiles?.forEach((t, i) =>
      t
        .byId()
        ?.classList.add(
          "transition",
          "ease-in-out",
          "duration-900",
          `delay-${i * 50 + 150}`,
          ...TILE_ANIM_KEY1,
        ),
    );

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.tiles?.forEach((t) => {
          t.byId()?.classList.remove(...TILE_ANIM_KEY1);
          t.byId()?.classList.add(...TILE_ANIM_KEY2);
        });
      }),
    );
  }

  async loadData(): Promise<void> {
    let path = "/user";
    if (this.username === APP.userInfo?.username) {
      path = `/user/${this.username}`;
    }
    path = "/user";

    const thenJson = (x: Promise<Response>) =>
      x.then(async (r) => await r.json()).catch(console.error);

    const [resp, friends, stats] = await Promise.all([
      API.fetch(path),
      thenJson(API.fetch(`${path}/friends`)),
      thenJson(API.fetch(`${path}/stats`)),
    ]);

    if (resp.status === 401) {
      APP.onLogout();
      this.router.navigate("/login");
      return;
    }
    if (!resp.ok && resp.status !== 304) {
      this.router.navigate(404, false);
      return;
    }
    if (!friends || !stats) {
      return;
    }

    const userInfo = (await resp.json().catch(console.error)) as
      | void
      | ApiPaths["/users/{username}"]["get"]["responses"]["200"]["content"]["application/json"];
    if (!userInfo) {
      return;
    }
    this.userInfo = userInfo;
    this.friends =
      friends as ApiPaths["/users/{username}/friends"]["get"]["responses"]["200"]["content"]["application/json"];
    this.stats =
      stats as ApiPaths["/users/{username}/stats"]["get"]["responses"]["200"]["content"]["application/json"];

    const ids = new Set(
      this.stats.recentMatches.flatMap((x) => x.players).map((x) => x.id),
    );
    let proms = [];
    const userInfos: Map<number | string, UserInfo> = new Map();
    for (const id of ids) {
      proms.push(userFromMaybeId(id).then((info) => userInfos.set(id, info)));
    }
    await Promise.all(proms);

    this.recentGames = this.stats.recentMatches.map((g) => {
      (g as GameResultExt).playerInfos = g.players.map((p) =>
        userInfos.get(p.id),
      ) as UserInfo[];
      (g as GameResultExt).thisUser = this.userInfo?.id;
      return g as GameResultExt;
    });

    if (this.router.currentPage !== this) {
      return;
    }

    this.userInfoTile().redrawInner();
    this.friendsTile().redrawInner();
    this.matchHistoryTile().redrawInner();
  }
}
