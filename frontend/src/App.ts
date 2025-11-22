import "./styles.css";

import Router, { Page } from "./Router";
import WelcomePage from "./pages/Welcome";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import NotFoundPage from "./pages/NotFound";
import PageHeader from "./pages/Header";
import { API, SelfInfo } from "./Api";
import FriendsPage from "./pages/Friends";
import MatchHistoryPage from "./pages/MatchHistory";
import { AElement } from "./pages/elements/Elements";
import RegisterPage from "./pages/Register";
import TournamentHistoryPage from "./pages/TournamentHistory";
import LogoutPage from "./pages/Logout";
import GithubCallback from "./pages/OauthCallback";
import SettingsPage from "./pages/Settings";
import PlayPage from "./pages/Play";
import GameLocalPage from "./pages/GameLocal";
import GameTournamentLocalPage from "./pages/GameTournamentLocal";
import { CustomGamePage, WaitingMenu } from "./pages/CustomGame";
import QueuePage from "./pages/Queue";

export const getUsername = (): string | null => {
  return (
    new URLSearchParams(location.search).get("user")
    ?? APP.userInfo?.username
    ?? null
  );
};

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

class App {
  readonly router: Router;

  header: PageHeader;
  readonly headerRoot: HTMLElement;
  evtSource: EventSource;
  userInfo: SelfInfo | null;

  constructor(userInfo: SelfInfo | null) {
    this.router = new Router();
    this.userInfo = userInfo;

    this.evtSource = new EventSource("/api/v1/events");
    this.evtSource.onmessage = (_e) => {
      // TODO(Vaiva): SSE handler
    };

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
}

const resp = await API.fetch("/user");
const info: SelfInfo | null =
  resp.ok || resp.status === 304 ?
    await resp.json().catch(console.error)
  : null;

export const APP = new App(info);
