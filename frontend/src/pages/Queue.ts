import { APP } from "../App";
import Router, { Page } from "../Router";
import { AElement, Div, Paragraph, Button, Header } from "./elements/Elements";
import {
  DEFAULT_BUTTON,
  PRIMARY_BUTTON,
  EVIL_RED_BUTTON,
  TIMER_COUNTDOWN,
  TIMER_NORMAL,
  PLAYER_COLOURS,
} from "./elements/CssUtils";
import { PongApp } from "../game/PongGame";
import { PlayerAvatar, GameHUD, GameOverlay } from "./elements/GameElements";

type QueueState = "searching" | "found" | "playing" | "finished";

export default class QueuePage extends Page {
  private queueState: QueueState = "searching";
  private gameInstance: PongApp | null = null;
  private gameKey: { key: string; gameId: string } | null = null;
  private finalScores: { player: number; score: number }[] = [];
  private opponentUsername: string = "Opponent";
  private opponentAvatarUrl?: string;
  private myAvatarUrl?: string;

  private searchingOverlay!: GameOverlay;
  private readyOverlay!: GameOverlay;
  private gameoverOverlay!: GameOverlay;
  private gameScreen!: Div;
  private finalScoresDiv!: Div;
  private leaveQueueBtn!: Button;
  private readyBtn!: Button;
  private exitBtn!: Button;

  constructor(router: Router) {
    super(router);
  }

  content(): AElement[] {
    // Searching overlay
    this.leaveQueueBtn = new Button(
      new Paragraph("Leave Queue").class("py-3 px-8"),
    )
      .class(EVIL_RED_BUTTON)
      .withId("leave-queue-btn")
      .withOnclick(() => this.leaveQueue()) as Button;

    this.searchingOverlay = new GameOverlay(
      "",
      new Header(1, "Searching for opponent...").class(
        "text-2xl font-bold text-white mb-6 text-center",
      ),

      new Div(
        new Div()
          .class(
            "w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin",
          )
          .withId("loading-spinner"),
      ).class("flex justify-center mb-6"),

      new Paragraph("Waiting for another player to join").class(
        "text-sm text-neutral-400 mb-6 text-center",
      ),

      new Div(this.leaveQueueBtn).class("flex justify-center"),
    ).withId("searching-overlay") as GameOverlay;

    // Ready button
    this.readyBtn = new Button(
      new Paragraph("Ready!").class("text-xl py-4 px-12"),
    )
      .class(PRIMARY_BUTTON)
      .withId("ready-btn")
      .withOnclick(() => this.startGame()) as Button;

    // Ready overlay
    this.readyOverlay = new GameOverlay(
      "!p-8 flex flex-col items-center max-w-md",
      new Paragraph("Match Found!").class(
        "text-2xl font-bold text-white mb-6 text-center",
      ),

      new Paragraph("Game Rules").class(
        "text-sm font-bold text-neutral-300 mb-2 text-center",
      ),

      new Div(
        new Paragraph("First to 7 points wins").class(
          "text-sm text-neutral-400",
        ),
        new Paragraph("Game ends after 2 minutes").class(
          "text-sm text-neutral-400",
        ),
        new Paragraph("Own goals lose a point").class(
          "text-sm text-neutral-400",
        ),
      ).class("mb-6 text-center"),

      new Paragraph("Controls").class(
        "text-sm font-bold text-neutral-300 mb-2 text-center",
      ),

      new Div(
        new Paragraph("W / S - Move paddle up/down").class(
          "text-sm text-neutral-400",
        ),
      ).class("mb-8 text-center"),

      new Div(this.readyBtn).class("flex justify-center"),
    )
      .withId("ready-overlay")
      .class("hidden") as GameOverlay;

    // Final scores div
    this.finalScoresDiv = new Div().withId("final-scores").class("mb-8") as Div;

    // Exit button
    this.exitBtn = new Button(new Paragraph("Exit").class("py-3 px-8"))
      .class(DEFAULT_BUTTON)
      .withId("exit-btn")
      .withOnclick(() => this.router.navigate("/play")) as Button;

    // Game over overlay
    this.gameoverOverlay = new GameOverlay(
      "",
      new Paragraph("Game Over!").class(
        "text-4xl font-bold text-white mb-8 text-center",
      ),

      this.finalScoresDiv,

      new Div(this.exitBtn).class("flex gap-4 justify-center"),
    )
      .withId("gameover-overlay")
      .class("hidden") as GameOverlay;

    // Game screen
    this.gameScreen = new Div(
      // Canvas container
      new Div()
        .withId("canvas-container")
        .class("absolute inset-0 bg-gray-900"),

      // Top HUD bar
      new Div()
        .withId("game-hud")
        .class("absolute top-0 left-0 right-0 bg-zinc-800 p-4"),

      this.searchingOverlay,
      this.readyOverlay,
      this.gameoverOverlay,
    )
      .withId("game-screen")
      .class("relative w-full h-screen overflow-hidden") as Div;

    return [this.gameScreen];
  }

  bindEvents(): void {
    APP.headerRoot.style.display = "none";

    this.leaveQueueBtn.bindEvents();
    this.readyBtn.bindEvents();
    this.exitBtn.bindEvents();

    this.initializeGameUI();
    this.renderQueueState();

    if (this.queueState !== "finished") {
      this.joinQueue();
    }
  }

  transitionAway(): void {
    if (this.queueState !== "finished" && this.gameKey) {
      this.leaveQueue(false);
    }
    this.resetGame();
    this.restoreHeader();
  }

  private renderQueueState(): void {
    const searchingEl = this.searchingOverlay.byId();
    const readyEl = this.readyOverlay.byId();
    const gameoverEl = this.gameoverOverlay.byId();

    if (!searchingEl || !readyEl || !gameoverEl) return;

    searchingEl.classList.add("hidden");
    readyEl.classList.add("hidden");
    gameoverEl.classList.add("hidden");

    switch (this.queueState) {
      case "searching":
        searchingEl.classList.remove("hidden");
        break;
      case "found":
        readyEl.classList.remove("hidden");
        break;
      case "playing":
        break;
      case "finished":
        gameoverEl.classList.remove("hidden");
        this.displayFinalScores();
        break;
    }
  }

  private async joinQueue(): Promise<void> {
    try {
      let response = await fetch("/api/v1/queue/join", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error joining queue:", response.status, errorText);

        if (response.status === 409) {
          await this.leaveQueue(false);

          response = await fetch("/api/v1/queue/join", {
            method: "POST",
            credentials: "include",
          });

          if (!response.ok) {
            const retryError = await response.text();
            console.error(
              "Failed to rejoin queue:",
              response.status,
              retryError,
            );
            alert("Could not join queue. Please try again.");
            this.restoreHeader();
            this.router.navigate("/play");
            return;
          }
        } else if (response.status === 401) {
          alert("Authentication failed. Please log in again.");
          this.restoreHeader();
          this.router.navigate("/login");
          return;
        } else {
          alert("Failed to join queue: " + errorText);
          this.restoreHeader();
          this.router.navigate("/play");
          return;
        }
      }

      const data = await response.json();
      this.gameKey = data;
      this.queueState = "searching";
      this.renderQueueState();
      this.initialiseGame();
    } catch (error) {
      console.error("Error joining queue:", error);
      alert("Failed to join queue. Please try again.");
      this.restoreHeader();
      this.router.navigate("/play");
    }
  }

  private async leaveQueue(navigateAway: boolean = true): Promise<void> {
    try {
      const response = await fetch("/api/v1/queue/leave", {
        method: "DELETE",
        credentials: "include",
      });

      if (navigateAway) {
        this.resetGame();
        this.restoreHeader();
        this.router.navigate("/play");
      }
    } catch (error) {
      console.error("Error leaving queue:", error);
    }
  }

  private initializeGameUI(): void {
    const hudContainer = document.getElementById("game-hud");
    if (hudContainer) {
      hudContainer.innerHTML = "";
    }
  }

  private initialiseGame(): void {
    const container = document.getElementById("canvas-container");
    if (!container || !this.gameKey) return;

    const canvas = document.createElement("canvas");
    canvas.id = "gameCanvas";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.tabIndex = 1;
    container.innerHTML = "";
    container.appendChild(canvas);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws`;

    this.gameInstance = new PongApp(wsUrl, this.gameKey.key, APP.userInfo?.id);
    this.setupGameListeners();
    canvas.focus();

    // Wait for myPid to be set before creating HUD
    (this as any).pidCheckInterval = setInterval(() => {
      if (
        this.gameInstance
        && this.gameInstance.myPid !== undefined
        && this.gameInstance.myPid !== -1
      ) {
        clearInterval((this as any).pidCheckInterval);
        delete (this as any).pidCheckInterval;
        this.createGameHUD();
      }
    }, 50);
  }

  private async createGameHUD(): Promise<void> {
    const hudContainer = document.getElementById("game-hud");
    if (!hudContainer || !this.gameInstance) return;

    const myPid = this.gameInstance.myPid;
    if (myPid === undefined || myPid === -1) return;

    const opponentPid = myPid === 0 ? 1 : 0;
    const opponentUserId = this.gameInstance.playerUserIds.get(opponentPid);
    let opponentName = "Waiting...";
    let opponentAvatar: string | undefined;

    if (opponentUserId && this.queueState !== "searching") {
      try {
        const response = await fetch(`/api/v1/users/${opponentUserId}`);
        if (response.ok) {
          const opponentInfo = await response.json();
          opponentName = opponentInfo.username;
          opponentAvatar = `/api/v1/user/avatars/${opponentInfo.username}.webp`;
          this.opponentUsername = opponentName;
          this.opponentAvatarUrl = opponentAvatar;
        }
      } catch (error) {
        console.error("Failed to fetch opponent info:", error);
        opponentName = "Opponent";
      }
    }

    const myAvatar =
      APP.userInfo?.username ?
        `/api/v1/user/avatars/${APP.userInfo.username}.webp`
      : undefined;
    this.myAvatarUrl = myAvatar;

    // HUD shows you on left, opponent on right
    // Score IDs map to actual player positions (0=pink, 1=green)
    const players = [
      new PlayerAvatar(
        "You",
        `score-${myPid}`,
        PLAYER_COLOURS[myPid],
        "left",
        myAvatar,
      ),
      new PlayerAvatar(
        opponentName,
        `score-${opponentPid}`,
        PLAYER_COLOURS[opponentPid],
        "right",
        opponentAvatar,
      ),
    ];

    hudContainer.innerHTML = new GameHUD(players)
      .withId("game-hud-content")
      .render();
  }

  private setupGameListeners(): void {
    if (!this.gameInstance?.sock) return;

    const originalHandler = this.gameInstance.sock.onmessage;
    this.gameInstance.sock.onmessage = (ev: MessageEvent) => {
      originalHandler?.call(this.gameInstance!.sock, ev);

      try {
        const msg = JSON.parse(ev.data);

        if (msg.type === "game_join" && msg.pid !== undefined) {
          this.createGameHUD();
        }

        if (msg.type === "player_list" && this.queueState === "searching") {
          const connectedPlayers = msg.players?.filter(
            (p: any) => p.userId !== null,
          );
          if (connectedPlayers?.length === 2) {
            this.queueState = "found";
            this.renderQueueState();
            this.createGameHUD();
          }
        }

        if (msg.type === "game_start") {
          this.queueState = "playing";
          this.renderQueueState();
          this.startUIUpdates();
          // Focus canvas so keyboard input works immediately
          const canvas = document.getElementById(
            "gameCanvas",
          ) as HTMLCanvasElement;
          if (canvas) canvas.focus();
        }

        if (msg.type === "game_end") {
          this.onGameEnd(msg);
        }

        if (msg.type === "game_abandoned") {
          alert("Game was abandoned: " + msg.reason);
          this.resetGame();
          this.restoreHeader();
          this.router.navigate("/play");
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
  }

  private startGame(): void {
    if (!this.gameInstance) return;

    if (this.gameInstance.player1?.ws.readyState === WebSocket.OPEN) {
      this.gameInstance.player1.ws.send(JSON.stringify({ type: "ready" }));
    }

    // Update button text if game doesn't start immediately
    setTimeout(() => {
      if (this.queueState === "found") {
        this.readyBtn.contents = [
          new Paragraph("Waiting for opponent...").class("text-xl py-4 px-12"),
        ];
        this.readyBtn.redrawInner();
      }
    }, 50);
  }

  private startUIUpdates(): void {
    const intervalId = setInterval(() => {
      if (!this.gameInstance?.gameState) return;

      const { gameState, params } = this.gameInstance;

      for (let i = 0; i < 2; i++) {
        const scoreEl = document.getElementById(`score-${i}`);
        if (scoreEl && gameState.players?.[i]) {
          scoreEl.textContent = String(gameState.players[i].score);
        }
      }

      const timerEl = document.getElementById("game-timer");
      if (!timerEl) return;

      if (gameState.pauseCd > 0) {
        const countdown = Math.ceil((gameState.pauseCd * params.tickMs) / 1000);
        timerEl.textContent = String(countdown);
        timerEl.classList.remove(...TIMER_NORMAL);
        timerEl.classList.add(...TIMER_COUNTDOWN);
      } else {
        const seconds = Math.floor(gameState.time / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        timerEl.classList.remove(...TIMER_COUNTDOWN);
        timerEl.classList.add(...TIMER_NORMAL);
      }
    }, 100);

    (this as any).updateIntervalId = intervalId;
  }

  private onGameEnd(msg: any): void {
    if ((this as any).updateIntervalId) {
      clearInterval((this as any).updateIntervalId);
      delete (this as any).updateIntervalId;
    }

    const players =
      msg.players?.length > 0 ?
        msg.players
      : this.gameInstance?.gameState?.players;
    if (players) {
      this.finalScores = players.map((p: any, idx: number) => ({
        player: idx + 1,
        score: p.score,
      }));
    }

    this.queueState = "finished";
    this.renderQueueState();
  }

  private restoreHeader(): void {
    APP.headerRoot.style.display = "";
  }

  private displayFinalScores(): void {
    if (this.finalScores.length < 2 || !this.gameInstance) return;

    const myPid = this.gameInstance.myPid;
    const myScore = this.finalScores[myPid].score;
    const opponentPid = myPid === 0 ? 1 : 0;
    const opponentScore = this.finalScores[opponentPid].score;

    const elements: AElement[] = [];

    if (myScore > opponentScore) {
      elements.push(
        new Div(
          new Paragraph("You Win!")
            .class("text-2xl font-bold mb-2")
            .withStyle(`color: ${PLAYER_COLOURS[myPid]};`),
        ).class("mb-6 text-center"),
      );
    } else if (opponentScore > myScore) {
      elements.push(
        new Div(
          new Paragraph(`${this.opponentUsername} Wins!`)
            .class("text-2xl font-bold mb-2")
            .withStyle(`color: ${PLAYER_COLOURS[opponentPid]};`),
        ).class("mb-6 text-center"),
      );
    } else {
      elements.push(
        new Div(
          new Paragraph("Draw!").class(
            "text-2xl font-bold mb-2 text-yellow-400",
          ),
        ).class("mb-6 text-center"),
      );
    }

    const myScoreData = this.finalScores[myPid];
    const opponentScoreData = this.finalScores[opponentPid];

    const createAvatar = (avatarUrl: string | undefined, color: string) => {
      return avatarUrl ?
          new Div()
            .class("w-10 h-10 rounded-full")
            .withStyle(
              `background-image: url('${avatarUrl}'); background-size: cover; background-position: center; outline: 2px solid ${color};`,
            )
        : new Div()
            .class("w-10 h-10 rounded-full")
            .withStyle(`background: ${color}; outline: 2px solid ${color};`);
    };

    const myCard = new Div(
      new Div(
        createAvatar(this.myAvatarUrl, PLAYER_COLOURS[myPid]),
        new Paragraph("You").class("text-xl font-bold text-white"),
      ).class("flex items-center gap-4"),
      new Paragraph(String(myScoreData.score))
        .class("text-3xl font-bold")
        .withStyle(`color: ${PLAYER_COLOURS[myPid]};`),
    ).class(
      "flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-2",
    );

    const opponentCard = new Div(
      new Div(
        createAvatar(this.opponentAvatarUrl, PLAYER_COLOURS[opponentPid]),
        new Paragraph(this.opponentUsername).class(
          "text-xl font-bold text-white",
        ),
      ).class("flex items-center gap-4"),
      new Paragraph(String(opponentScoreData.score))
        .class("text-3xl font-bold")
        .withStyle(`color: ${PLAYER_COLOURS[opponentPid]};`),
    ).class(
      "flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-2",
    );

    if (myScore >= opponentScore) {
      elements.push(myCard, opponentCard);
    } else {
      elements.push(opponentCard, myCard);
    }

    this.finalScoresDiv.contents = elements;
    this.finalScoresDiv.redrawInner();
  }

  private resetGame(): void {
    if ((this as any).updateIntervalId) {
      clearInterval((this as any).updateIntervalId);
      delete (this as any).updateIntervalId;
    }

    if ((this as any).pidCheckInterval) {
      clearInterval((this as any).pidCheckInterval);
      delete (this as any).pidCheckInterval;
    }

    if (this.gameInstance) {
      this.gameInstance.dispose();
      this.gameInstance = null;
    }

    const container = document.getElementById("canvas-container");
    if (container) container.innerHTML = "";

    const hudContainer = document.getElementById("game-hud");
    if (hudContainer) hudContainer.innerHTML = "";

    this.gameKey = null;
    this.finalScores = [];
    this.queueState = "searching";
  }
}
