// TODO: Handle when click back in browser during game then go back in -> 2 games as once and buggy
// TODO: Check usage of the router APP calls -> not currently doing it properly. Schemas.

import { APP } from "../App";
import { Page } from "../Router";
import {
  AElement,
  Div,
  Paragraph,
  Button,
  Header,
  Inline,
} from "./elements/Elements";
import {
  DEFAULT_BUTTON,
  PRIMARY_BUTTON,
  TIMER_COUNTDOWN,
  TIMER_NORMAL,
  PLAYER_COLOURS,
} from "./elements/CssUtils";
import { PongApp } from "../game/PongGame";
import { PlayerAvatar, GameHUD, ColoredText } from "./elements/GameElements";
import { createLocalGame, GameKey } from "../utils/gameUtils";

type GameState = "setup" | "waiting" | "playing" | "finished";

export default class GameLocalPage extends Page {
  private gameState: GameState = "setup";
  private canvasId = "gameCanvas";
  private gameInstance: PongApp | null = null;
  private gameKeys: GameKey[] = [];
  private nPlayers: number = 2;
  private finalScores: { player: number; score: number }[] = [];
  private gameDuration: number = 0;
  private readonly CONTROL_KEYS = ["W/S", "J/U", "T/Y", "V/B"];
  private updateIntervalId?: number;

  content(): AElement[] {
    return [
      new Div(
        // Setup screen
        new Div(
          new Header(1, "Local Multiplayer").class(
            "text-4xl font-bold text-white mb-8 text-center",
          ),

          new Paragraph("Select number of players:").class(
            "text-xl text-neutral-400 mb-6 text-center",
          ),

          new Div(
            new Button(new Paragraph("2 Players").class("text-xl py-4 px-8"))
              .class(DEFAULT_BUTTON)
              .withId("btn-2pl")
              .withOnclick(() => this.createGame(2)),

            new Button(new Paragraph("3 Players").class("text-xl py-4 px-8"))
              .class(DEFAULT_BUTTON)
              .withId("btn-3pl")
              .withOnclick(() => this.createGame(3)),

            new Button(new Paragraph("4 Players").class("text-xl py-4 px-8"))
              .class(DEFAULT_BUTTON)
              .withId("btn-4pl")
              .withOnclick(() => this.createGame(4)),
          ).class("flex gap-4 justify-center"),
        )
          .withId("setup-screen")
          .class("flex flex-col justify-center items-center min-h-screen"),

        // Game screen (hidden initially)
        new Div(
          // Canvas container
          new Div()
            .withId("canvas-container")
            .class("absolute inset-0 bg-gray-900"),

          // Top HUD bar
          new Div()
            .withId("game-hud")
            .class("absolute top-0 left-0 right-0 bg-zinc-800 p-4"),

          // Center overlay for ready button
          new Div(
            new Div(
              new Paragraph("All players ready?").class(
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

              new Paragraph("Player Controls").class(
                "text-sm font-bold text-neutral-300 mb-2 text-center",
              ),

              new Paragraph("")
                .withId("controls-info")
                .class("text-sm text-neutral-400 mb-8 text-center"),

              new Div(
                new Button(
                  new Paragraph("Start Game").class("text-xl py-4 px-12"),
                )
                  .class(PRIMARY_BUTTON)
                  .withId("ready-btn")
                  .withOnclick(() => this.startGame()),
              ).class("flex justify-center"),
            ).class(
              "bg-black/80 backdrop-blur-md p-8 rounded-xl outline outline-2 outline-pink-500 flex flex-col items-center max-w-md",
            ),
          )
            .withId("ready-overlay")
            .class("absolute inset-0 flex items-center justify-center hidden"),

          // Permanent controls display in top right
          new Div()
            .withId("controls-display")
            .class(
              "absolute top-24 right-4 bg-black/50 backdrop-blur-sm p-3 rounded-lg flex flex-col gap-2 hidden",
            ),

          // Game over overlay
          new Div(
            new Div(
              new Paragraph("Game Over!").class(
                "text-4xl font-bold text-white mb-8 text-center",
              ),

              new Div().withId("final-scores").class("mb-8"),

              new Div(
                new Button(new Paragraph("Play Again").class("py-3 px-8"))
                  .class(PRIMARY_BUTTON)
                  .withId("play-again-btn")
                  .withOnclick(() => {
                    this.resetGame();
                    this.gameState = "setup";
                    this.renderGameState();
                    this.bindEvents();
                  }),

                new Button(new Paragraph("Exit").class("py-3 px-8"))
                  .class(DEFAULT_BUTTON)
                  .withId("exit-btn")
                  .withOnclick(() => {
                    // Restore header
                    const header = document.querySelector("header");
                    if (header) {
                      (header as HTMLElement).style.display = "";
                    }
                    this.router.navigate("/dashboard");
                  }),
              ).class("flex gap-4 justify-center"),
            ).class(
              "bg-black/80 backdrop-blur-md p-12 rounded-xl outline outline-2 outline-pink-500",
            ),
          )
            .withId("gameover-overlay")
            .class("absolute inset-0 flex items-center justify-center hidden"),
        )
          .withId("game-screen")
          .class("relative w-full h-screen overflow-hidden hidden"),
      ).class("relative w-full h-screen overflow-hidden"),
    ];
  }

  bindEvents(): void {
    // Hide page header for fullscreen
    APP.headerRoot.style.display = "none";

    this.renderGameState();
    this.bindSetupButtons();
  }

  transitionAway(): void {
    // Clean up game resources when navigating away
    this.resetGame();
    this.restoreHeader();
  }

  private bindSetupButtons(): void {
    ["btn-2pl", "btn-3pl", "btn-4pl"].forEach((id, i) => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = () => this.createGame(i + 2);
    });
  }

  private renderGameState(): void {
    const setupScreen = document.getElementById("setup-screen");
    const gameScreen = document.getElementById("game-screen");
    const readyOverlay = document.getElementById("ready-overlay");
    const gameoverOverlay = document.getElementById("gameover-overlay");

    if (!setupScreen || !gameScreen || !readyOverlay || !gameoverOverlay)
      return;

    // Hide all screens first
    [setupScreen, gameScreen, readyOverlay, gameoverOverlay].forEach((el) =>
      el.classList.add("hidden"),
    );

    switch (this.gameState) {
      case "setup":
        setupScreen.classList.remove("hidden");
        break;

      case "waiting":
        gameScreen.classList.remove("hidden");
        readyOverlay.classList.remove("hidden");
        break;

      case "playing":
        gameScreen.classList.remove("hidden");
        break;

      case "finished":
        gameScreen.classList.remove("hidden");
        gameoverOverlay.classList.remove("hidden");
        this.displayFinalScores();
        break;
    }
  }

  private async createGame(nPlayers: number): Promise<void> {
    console.log("createGame called with nPlayers:", nPlayers);
    this.nPlayers = nPlayers;

    try {
      console.log("Calling api to get new local game");
      this.gameKeys = await createLocalGame(nPlayers);

      console.log("Local game created:", this.gameKeys);

      this.initialiseGame();

      this.gameState = "waiting";
      this.renderGameState();
      this.updateControlsInfo();
      this.bindReadyButton();
    } catch (error) {
      console.error("Error creating local game:", error);
      alert("Failed to create game. Please try again.");
    }
  }

  private bindReadyButton(): void {
    const readyBtn = document.getElementById("ready-btn");
    if (readyBtn) {
      readyBtn.onclick = () => this.startGame();
    }
  }

  private initialiseGame(): void {
    const container = document.getElementById("canvas-container");
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.id = this.canvasId;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.tabIndex = 1;
    container.innerHTML = "";
    container.appendChild(canvas);

    // Set up WebSocket URL (dynamic ws/wss until HTTPS is configured)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws`;
    const [t1, t2, t3, t4] = this.gameKeys.map((k) => k.key);

    console.log("Initialising PongApp with", this.nPlayers, "players");

    setTimeout(() => {
      this.gameInstance = new PongApp(wsUrl, t1, undefined, t2, t3, t4);
      canvas.focus();
      this.createGameHUD();
      this.setupGameEndListener();
    }, 0);
  }

  private createGameHUD(): void {
    const hudContainer = document.getElementById("game-hud");
    if (!hudContainer) return;

    const players = Array.from({ length: this.nPlayers }, (_, i) => {
      return new PlayerAvatar(
        `Player ${i + 1}`,
        `score-${i}`,
        PLAYER_COLOURS[i],
        i === 0 || i === 3 ? "left" : "right",
      );
    });

    hudContainer.innerHTML = new GameHUD(players)
      .withId("game-hud-content")
      .render();
  }

  private updateControlsInfo(): void {
    const controlsInfo = document.getElementById("controls-info");
    if (!controlsInfo) return;

    const elements: AElement[] = [];

    for (let i = 0; i < this.nPlayers; i++) {
      if (i > 0) elements.push(new Inline("  |  "));

      elements.push(
        new ColoredText(`Player ${i + 1}`, PLAYER_COLOURS[i]),
        new Inline(`: ${this.CONTROL_KEYS[i]}`),
      );
    }

    controlsInfo.innerHTML = elements.map((e) => e.render()).join("");
  }

  private updatePermanentControls(): void {
    const controlsDisplay = document.getElementById("controls-display");
    if (!controlsDisplay) return;

    const controls: string[] = [
      '<p class="text-xs font-bold text-neutral-300 mb-2">Controls</p>',
    ];

    for (let i = 0; i < this.nPlayers; i++) {
      const colour = PLAYER_COLOURS[i];
      controls.push(`
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full" style="background: ${colour};"></div>
          <span class="text-xs text-neutral-300">${this.CONTROL_KEYS[i]}</span>
        </div>
      `);
    }

    controlsDisplay.innerHTML = controls.join("");
    controlsDisplay.classList.remove("hidden");
  }

  private startGame(): void {
    if (!this.gameInstance) return;

    const startTime = Date.now();

    // Send ready signal for all connected players
    [
      this.gameInstance.player1,
      this.gameInstance.player2,
      this.gameInstance.player3,
      this.gameInstance.player4,
    ]
      .filter(
        (p): p is NonNullable<typeof p> =>
          p !== undefined && p.ws.readyState === WebSocket.OPEN,
      )
      .forEach((p) => {
        p.ws.send(JSON.stringify({ type: "ready" }));
        console.log("Sent ready for player");
      });

    this.gameState = "playing";
    this.renderGameState();

    // Show permanent controls display
    this.updatePermanentControls();

    const canvas = document.getElementById(this.canvasId) as HTMLCanvasElement;
    if (canvas) canvas.focus();

    this.startUIUpdates(startTime);
  }

  private startUIUpdates(startTime: number): void {
    this.updateIntervalId = window.setInterval(() => {
      if (!this.gameInstance?.gameState) return;

      const { gameState, params } = this.gameInstance;

      // Update scores
      for (let i = 0; i < this.nPlayers; i++) {
        const scoreEl = document.getElementById(`score-${i}`);
        if (scoreEl && gameState.players?.[i]) {
          scoreEl.textContent = String(gameState.players[i].score);
        }
      }

      // Update timer
      const timerEl = document.getElementById("game-timer");
      if (!timerEl) return;

      if (gameState.pauseCd > 0) {
        // Show countdown
        const countdown = Math.ceil((gameState.pauseCd * params.tickMs) / 1000);
        timerEl.textContent = String(countdown);
        timerEl.classList.remove(...TIMER_NORMAL);
        timerEl.classList.add(...TIMER_COUNTDOWN);
      } else {
        // Show elapsed time, maybe change for countdown instead?
        const seconds = Math.floor(gameState.time / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        timerEl.classList.remove(...TIMER_COUNTDOWN);
        timerEl.classList.add(...TIMER_NORMAL);
        this.gameDuration = Date.now() - startTime;
      }
    }, 100);
  }

  private setupGameEndListener(): void {
    if (!this.gameInstance?.sock) return;

    const originalHandler = this.gameInstance.sock.onmessage;
    this.gameInstance.sock.onmessage = (ev: MessageEvent) => {
      originalHandler?.call(this.gameInstance!.sock, ev);

      // Check for game_end message
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "game_end") {
          console.log("Game ended!", msg);
          this.onGameEnd(msg);
        }
      } catch (e) {
        // errors
      }
    };
  }

  private onGameEnd(msg: any): void {
    console.log("Game ended!", msg);

    // Stop UI updates
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = undefined;
    }

    // Get final scores from message or fallback to game state
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

    // Capture duration from game_end message
    this.gameDuration = msg.duration || 0;

    console.log("Final scores:", this.finalScores);
    console.log("Game duration:", this.gameDuration);

    this.gameState = "finished";
    this.renderGameState();
    this.bindGameOverButtons();
  }

  private bindGameOverButtons(): void {
    console.log("Binding game over buttons...");

    setTimeout(() => {
      const playAgainBtn = document.getElementById("play-again-btn");
      const exitBtn = document.getElementById("exit-btn");

      if (playAgainBtn) {
        console.log("Binding play again button");
        playAgainBtn.onclick = () => {
          console.log("Play again clicked");
          this.resetGame();
          this.gameState = "setup";
          this.renderGameState();
          this.bindSetupButtons();
        };
      }

      if (exitBtn) {
        console.log("Binding exit button");
        exitBtn.onclick = () => {
          console.log("Exit clicked");
          this.restoreHeader();
          this.router.navigate("/dashboard");
        };
      }
    }, 100);
  }

  private restoreHeader(): void {
    APP.headerRoot.style.display = "";
  }

  private displayFinalScores(): void {
    const scoresContainer = document.getElementById("final-scores");
    if (!scoresContainer) return;

    const sorted = [...this.finalScores].sort((a, b) => b.score - a.score);
    const topScore = sorted[0].score;
    const winners = sorted.filter((s) => s.score === topScore);

    // Winner/draw announcement
    let winnerHTML = "";
    if (winners.length > 1) {
      const names = winners.map((w) => `Player ${w.player}`).join(" & ");
      winnerHTML = `
        <div class="mb-6 text-center">
          <p class="text-2xl font-bold mb-2 text-yellow-400">Draw!</p>
          <p class="text-lg text-white">${names}</p>
        </div>
      `;
    } else {
      const winner = winners[0];
      const colour = PLAYER_COLOURS[winner.player - 1];
      winnerHTML = `
        <div class="mb-6 text-center">
          <p class="text-2xl font-bold mb-2" style="color: ${colour};">
            Player ${winner.player} Wins!
          </p>
        </div>
      `;
    }

    const scoresHTML = sorted
      .map((s) => {
        const colour = PLAYER_COLOURS[s.player - 1];
        return `
        <div class="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-2">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full" style="background: ${colour}; outline: 2px solid ${colour};"></div>
            <span class="text-xl font-bold text-white">Player ${s.player}</span>
          </div>
          <span class="text-3xl font-bold" style="color: ${colour};">${s.score}</span>
        </div>
      `;
      })
      .join("");

    scoresContainer.innerHTML = winnerHTML + scoresHTML;
  }

  private resetGame(): void {
    // Stop UI updates interval
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = undefined;
    }

    if (this.gameInstance) {
      //ADDED: to clean up all resources
      this.gameInstance.dispose();
      this.gameInstance = null;
    }

    const container = document.getElementById("canvas-container");
    if (container) {
      container.innerHTML = "";
    }

    // Hide and clear permanent controls display
    const controlsDisplay = document.getElementById("controls-display");
    if (controlsDisplay) {
      controlsDisplay.classList.add("hidden");
      controlsDisplay.innerHTML = "";
    }

    this.gameKeys = [];
    this.finalScores = [];
    this.gameDuration = 0;
    this.nPlayers = 2;
  }
}
