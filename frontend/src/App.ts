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

  constructor(
    private router: Router,
    private gameId: string,
    private from: number,
  ) {
    super();
    this.acceptBtn.withOnclick(this.onAccept.bind(this));
    this.refuseBtn.withOnclick(this.onRefuse);
    this.senderText.text = `Sender: ${getSomeonesUsername(this.from)}`;

    this.class(
      "absolute inset-0 flex items-center justify-center popup pointer-events-auto flex flex-col ",
    );

    // Div principale contenant texte + boutons
    this.textDiv.class(
      "pointer-events-auto bg-zinc-900 p-6 rounded-lg w-[40vw] max-w-xl min-h-[20vh] flex flex-col justify-between",
    );

    // Titre et sous-titre
    this.headerText.class("text-white text-2xl font-semibold");
    this.senderText.class("text-white/60 text-lg");

    // Div boutons sur une *ligne*
    this.buttonDiv.class("mt-4 flex flex-row justify-end gap-4");

    // Bouton ACCEPT — bord normal, NEON bleu au hover
    this.acceptBtn.class(
      "px-6 py-6 rounded-md border border-zinc-600 min-w-[100px] "
        + "hover:border-blue-500 hover:ring-2 hover:ring-blue-400 "
        + "transition-all duration-150",
    );

    // Bouton REFUSE — bord normal, rouge uniquement au hover
    this.refuseBtn.class(
      "px-6 py-6 rounded-md border border-zinc-600 min-w-[100px] "
        + "hover:border-red-500 hover:text-red-400 "
        + "transition-all duration-150",
    );

    this.textDiv.addContent([this.headerText, this.senderText]);
    this.buttonDiv.addContent([this.acceptBtn, this.refuseBtn]);
    this.contents = [this.textDiv, this.buttonDiv];
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
      this.router.navigate(`games/create`, true, { ...gamekey, nb_players: 2 });
    } else alert("failed in joining the GAME");
  }

  onRefuse() {
    console.log("onRefuse");
    APP.popupDiv.innerHTML = "";
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

  onMsg(e: MessageEvent<any>) {
    try {
      const event = JSON.parse(e.data);
      console.log("SSE event reçu :", event);
      switch (event.event) {
        case "GameInvite":
          this.onGameInvite(event as GameInvite);
          break;
        case "InviteAccepted":
          break;
      }
      setTimeout(() => {
        this.popupDiv.innerHTML = "";
      }, 10000);
    } catch (err) {
      console.error("Erreur parsing SSE :", err);
    }
  }

  onGameInvite(invite: GameInvite) {
    const popup: GameInvitePopup = new GameInvitePopup(
      this.router,
      invite.gameId,
      invite.from,
    );
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
