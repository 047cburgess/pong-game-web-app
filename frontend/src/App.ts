import "./styles.css";

import Router, { Page } from "./Router";
import WelcomePage from "./pages/Welcome";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import NotFoundPage from "./pages/NotFound";
import PageHeader from "./pages/Header";
import { API, SelfInfo, UserInfo } from "./Api";
import FriendsPage from "./pages/Friends";
import MatchHistoryPage from "./pages/MatchHistory";
import { AElement, Button, Div, Paragraph } from "./pages/elements/Elements";
import RegisterPage from "./pages/Register";
import TournamentHistoryPage from "./pages/TournamentHistory";
import LogoutPage from "./pages/Logout";
import GithubCallback from "./pages/OauthCallback";
import SettingsPage from "./pages/Settings";
import PlayPage from "./pages/Play";
import GameLocalPage from "./pages/GameLocal";
import GameTournamentLocalPage from "./pages/GameTournamentLocal";
import { CustomGamePage, gameKeys } from "./pages/CustomGame";
import QueuePage from "./pages/Queue";

export const getUsername = (): string | null => {
  return (
    new URLSearchParams(location.search).get("user")
    ?? APP.userInfo?.username
    ?? null
  );
};

async function getSomeonesUsername(id: number): Promise<string | undefined> {
  const resp = await fetch(`/api/v1/users/${id}`, { method: "GET" });
  if (!resp.ok) return undefined;
  return ((await resp.json()) as UserInfo).username;
}

export async function createCustomGame(i: number, toInvite: number[] = []) {
  console.log("onclick");
  const resp = await fetch("/api/v1/games/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ numberOfPlayers: i, invitedPlayerIds: toInvite }),
  });
  if (!resp.ok) {
    console.log("game creation failed");
    return;
  }
  const hostKey = (await resp.json()) as gameKeys;
  APP.router.navigate("/games/create", true, {
    ...hostKey,
    nb_players: i,
  });
}

class RedirToLogin extends Page {
  constructor(router: Router) {
    super(router, false);
  }

  content(): AElement[] {
    return [];
  }

  bindEvents() {
    APP.onLogout();
    this.router.navigate("/login");
  }
}

export interface GameInvite {
  event: "GameInvite";
  gameId: string;
  from: number;
}

//POST /games/{gameId}/invite
export class GameInvitePopup extends Div {
  private textDiv: Div = new Div().withId("GameInvite-text-div") as Div;
  private headerText: Paragraph = new Paragraph(
    "Game Invitation Received",
  ).withId("GameInvite-Header-text") as Paragraph;
  private senderText: Paragraph = new Paragraph("Sender: ").withId(
    "GameInvite-Sender-text",
  ) as Paragraph;
  private buttonDiv: Div = new Div().withId("GameInvite-Btns-div") as Div;
  private acceptBtn: Button = new Button().withId(
    "GameInvite-Btn-Accept",
  ) as Button;
  private refuseBtn: Button = new Button().withId(
    "GameInvite-Btns-Refuse",
  ) as Button;

  private mainContent: Div = new Div().withId(
    "GameInvitePopup-maincontent",
  ) as Div;

  private sendernamePromised: Promise<string | undefined>;

  constructor(
    private router: Router,
    private gameId: string,
    private from: number,
  ) {
    super();
    this.sendernamePromised = getSomeonesUsername(this.from);
    this.acceptBtn.withOnclick(this.onAccept.bind(this));
    this.refuseBtn.withOnclick(this.onRefuse.bind(this));
    this.senderText.text = `Sender: Unknown`;
    this.class("absolute inset-0 flex items-center justify-center");
    this.mainContent
      .class("popup bg-black/80 backdrop-blur-md p-8 rounded-xl")
      .class("outline outline-2 outline-pink-500 pointer-events-auto")
      .class("flex flex-col gap-6 w-[40vw] max-w-xl");
    this.textDiv.class("flex flex-col gap-2 w-full");
    this.headerText.class("text-white text-2xl font-bold");
    this.senderText.class("text-white/60 text-lg");
    this.buttonDiv.class("flex flex-row justify-end gap-4");
    this.acceptBtn
      .class("px-6 py-3 rounded-md border border-zinc-600 min-w-[120px]")
      .class("hover:border-blue-500 hover:ring-2 hover:ring-blue-400")
      .class("transition-all duration-150");
    this.acceptBtn.addContent(new Paragraph("Accept"));
    this.refuseBtn
      .class("px-6 py-3 rounded-md border border-zinc-600 min-w-[120px]")
      .class("hover:border-red-500 hover:ring-2 hover:ring-red-400")
      .class("transition-all duration-150");
    this.refuseBtn.addContent(new Paragraph("Refuse"));

    this.mainContent.addContent([this.textDiv, this.buttonDiv]);
    this.textDiv.addContent([this.headerText, this.senderText]);
    this.buttonDiv.addContent([this.acceptBtn, this.refuseBtn]);
    this.contents = [this.mainContent];
  }

  async onAccept() {
    console.log("onAccept");
    const resp = await fetch(`/api/v1/games/${this.gameId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: this.gameId,
      }),
    });
    if (resp.ok) {
      const gamekey = (await resp.json()) as gameKeys;
      this.router.navigate(`games/create`, true, {
        ...gamekey,
        nb_players: -1,
      });
    } else alert("failed in joining the GAME");
    APP.popupDiv.innerHTML = "";
  }

  async onRefuse() {
    console.log("onRefuse");
    const resp = await fetch(`/api/v1/games/${this.gameId}/decline`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: this.gameId,
      }),
    });
    APP.popupDiv.innerHTML = "";
  }

  async updateSender() {
    const str = await this.sendernamePromised;
    if (str) this.senderText.text = `Sender: ${str}`;
  }
}

class App {
  readonly router: Router;

  header: PageHeader;
  readonly headerRoot: HTMLElement;
  readonly popupDiv: HTMLElement;
  evtSource: EventSource;
  userInfo: SelfInfo | null;

  constructor(userInfo: SelfInfo | null) {
    this.router = new Router();
    this.userInfo = userInfo;

    this.popupDiv = document.getElementById("sse-pushups-zone")!;

    this.evtSource = new EventSource("/api/v1/events");
    this.evtSource.onmessage = (_e) => this.onMsg(_e);

    this.headerRoot = document.getElementsByTagName("header")[0] as HTMLElement;
    this.header = "fuck typescript" as any as PageHeader;
    this.reloadHeader();

    this.router.addError(404, NotFoundPage);
    this.router.addError(401, RedirToLogin);

    this.router.addRoute("", WelcomePage);
    this.router.addRoute("login", LoginPage);
    this.router.addRoute("dashboard", DashboardPage);
    this.router.addRoute("friends", FriendsPage);
    this.router.addRoute("game-history", MatchHistoryPage);
    this.router.addRoute("tournament-history", TournamentHistoryPage);
    this.router.addRoute("register", RegisterPage);
    this.router.addRoute("logout", LogoutPage);
    this.router.addRoute("user/oauth/github/callback", GithubCallback);
    this.router.addRoute("settings", SettingsPage);
    this.router.addRoute("play", PlayPage);
    this.router.addRoute("games/local", GameLocalPage);
    this.router.addRoute("games/create", CustomGamePage);
    this.router.addRoute("games/tournament/local", GameTournamentLocalPage);
    this.router.addRoute("queue", QueuePage);

    this.router.navigate(location.pathname + location.search, false);
  }

  private reloadHeader() {
    this.header = new PageHeader(this.router, this.userInfo);
    this.headerRoot.innerHTML = "";
    this.headerRoot.innerHTML = this.header
      .content()
      .map((e) => e.render())
      .join("");
    this.header.bindEvents();
  }

  onLogin(userInfo: SelfInfo) {
    this.userInfo = userInfo;
    this.reloadHeader();
  }

  onLogout() {
    this.userInfo = null;
    this.reloadHeader();
  }

  async onMsg(e: MessageEvent<any>) {
    try {
      const event = JSON.parse(e.data);
      console.log("SSE event reçu :", event);
      switch (event.event) {
        case "GameInvite":
          await this.onGameInvite(event as GameInvite);
          break;
        case "InviteDeclined":
          if (CustomGamePage.isInDuel) {
            alert("Invitation Declined... I guess they were scared");
            CustomGamePage.forceExit = true;
          }
          break;
      }

      setTimeout(() => {
        this.popupDiv.innerHTML = "";
      }, 10000);
    } catch (err) {
      console.error("Erreur parsing SSE :", err);
    }
  }

  async onGameInvite(invite: GameInvite) {
    alert(JSON.stringify(invite));
    const popup: GameInvitePopup = new GameInvitePopup(
      this.router,
      invite.gameId,
      invite.from,
    );
    await popup.updateSender();
    this.popupDiv.innerHTML = popup.render();
    popup.bindEvents();
  }
}

const resp = await API.fetch("/user");
const info: SelfInfo | null =
  resp.ok || resp.status === 304 ?
    await resp.json().catch(console.error)
  : null;

export const APP = new App(info);
