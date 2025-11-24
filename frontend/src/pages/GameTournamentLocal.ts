import { APP } from "../App";
import Router, { Page } from "../Router";
import {
  AElement,
  Div,
  Paragraph,
  Button,
  Header,
  Textbox,
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
import {
  PlayerAvatar,
  GameHUD,
  GameOverlay,
  ColoredText,
} from "./elements/GameElements";
import { createLocalGame, GameKey } from "../utils/gameUtils";

// Track which stage of the tournament we're in
type TournamentState = "setup" | "semi1" | "semi2" | "final" | "finished";

const PLAYER_COUNT = 4;
interface GameResult {
  gameId: string;
  players: { id: number | string; score: number }[];
  winnerId: number | string;
  duration: number;
}

export default class GameTournamentLocalPage extends Page {
  // Tournament progression tracking
  private tournamentState: TournamentState = "setup";
  private gameInstance: PongApp | null = null;
  private gameKeys: GameKey[] = [];
  private readonly CONTROL_KEYS = ["W/S", "J/U"];
  private currentPlayerIndices: [number, number] = [0, 1];

  // Player data (index 0 is always the host user)
  private playerNames: string[] = ["", "", "", ""];

  // Store results from each match
  private semi1Result: GameResult | null = null;
  private semi2Result: GameResult | null = null;
  private finalResult: GameResult | null = null;

  // Match pairings - indices refer to positions in playerNames array
  private semi1Players: [number, number] = [0, 1]; // Players 1 vs 2
  private semi2Players: [number, number] = [2, 3]; // Players 3 vs 4
  private finalPlayers: [number, number] = [0, 0]; // Winners from semis

  // UI elements
  private setupScreen!: Div;
  private gameScreen!: Div;
  private bracketDisplay!: Div;
  private controlsDisplay!: Div;
  private startBtn!: Button;
  private startMatchBtn!: Button;
  private newTournamentBtn!: Button;
  private readyBtn!: Button;
  private backToTournamentBtn!: Button;
  private readyOverlay!: GameOverlay;
  private gameOverOverlay!: GameOverlay;
  private gameOverScoresDiv!: Div;
  private winnerAnnouncement!: Div;
  private playerInputs: Textbox[] = [];
  private semi1Card!: Div;
  private semi2Card!: Div;
  private finalCard!: Div;

  constructor(router: Router) {
    super(router);
  }

  // Start a fresh tournament - reset everything to initial state
  private resetTournament(): void {
    this.tournamentState = "setup";
    this.playerNames = ["", "", "", ""];
    this.semi1Result = null;
    this.semi2Result = null;
    this.finalResult = null;
    this.semi1Players = [0, 1];
    this.semi2Players = [2, 3];
    this.finalPlayers = [0, 0];

    // Clear player inputs (except host which stays readonly)
    for (let i = 0; i < PLAYER_COUNT; i++) {
      const input = this.playerInputs[i].byId() as HTMLInputElement;
      if (input) {
        if (i === 0 && APP.userInfo?.username) {
          input.value = APP.userInfo.username;
          input.readOnly = true;
          this.playerNames[0] = APP.userInfo.username;
        } else {
          input.value = "";
          input.readOnly = false;
          // Re-enable input styling
          input.classList.remove(
            "cursor-not-allowed",
            "opacity-75",
            "bg-zinc-900",
          );
          input.classList.add("bg-zinc-800");
        }
      }
    }

    // Hide header and winner display
    APP.headerRoot.style.display = "none";
    this.winnerAnnouncement.class("hidden");
    this.winnerAnnouncement.redraw();

    this.newTournamentBtn.class("hidden");
    this.newTournamentBtn.redraw();

    this.startMatchBtn.class("hidden");
    this.startMatchBtn.redraw();

    const startBtn = this.startBtn.byId();
    if (startBtn) startBtn.style.display = "";

    this.updateBracketCards();
  }

  content(): AElement[] {
    // Setup screen - enter player names
    this.playerInputs = [];
    const playerInputFields: AElement[] = [];

    for (let i = 0; i < PLAYER_COUNT; i++) {
      const isHost = i === 0;
      const label = new Paragraph(
        isHost ? "Player 1 (Host)" : `Player ${i + 1} (Guest)`,
      ).class("text-white font-bold mb-2");

      let input: Textbox;
      if (isHost && APP.userInfo?.username) {
        // For host, create a readonly textbox
        input = new Textbox(`player-${i}-input`) as Textbox;
        input.class(
          "w-full p-3 rounded-lg bg-zinc-900 text-white outline outline-2 outline-neutral-700 cursor-not-allowed opacity-75",
        );
        this.playerNames[0] = APP.userInfo.username;
      } else {
        input = new Textbox(`player-${i}-input`).class(
          "w-full p-3 rounded-lg bg-zinc-800 text-white outline outline-2 outline-neutral-700 focus:outline-neutral-400",
        ) as Textbox;
      }

      this.playerInputs.push(input);

      const inputDiv = new Div(label, input).class("mb-4");
      playerInputFields.push(inputDiv);
    }

    this.startBtn = new Button(
      new Paragraph("Start Tournament").class("py-3 px-8"),
    )
      .class(PRIMARY_BUTTON)
      .withId("start-tournament-btn")
      .withOnclick(() => this.startTournament()) as Button;

    this.startMatchBtn = new Button(
      new Paragraph("Start Match").class("py-3 px-8"),
    )
      .class(PRIMARY_BUTTON)
      .class("hidden")
      .withId("start-match-btn") as Button;

    // Left column: player inputs
    const inputColumn = new Div(
      new Header(2, "Players").class("text-2xl font-bold text-white mb-4"),
      new Div(
        ...playerInputFields,
        new Div(this.startBtn).class("flex justify-center mt-6"),
      ).class("flex flex-col justify-center flex-1"),
    ).class("flex flex-col");

    // Create bracket card divs
    this.semi1Card = new Div(
      new Paragraph("-").class("text-neutral-500 text-center"),
    )
      .withId("semifinal-1")
      .class(
        "mb-4 bg-zinc-800 rounded-lg p-6 outline outline-2 outline-neutral-700 min-h-32 flex flex-col justify-center w-80",
      ) as Div;

    this.semi2Card = new Div(
      new Paragraph("-").class("text-neutral-500 text-center"),
    )
      .withId("semifinal-2")
      .class(
        "bg-zinc-800 rounded-lg p-6 outline outline-2 outline-neutral-700 min-h-32 flex flex-col justify-center w-80",
      ) as Div;

    this.finalCard = new Div(
      new Paragraph("-").class("text-neutral-500 text-center"),
    )
      .withId("final-game")
      .class(
        "bg-zinc-800 rounded-lg p-6 outline outline-2 outline-neutral-700 min-h-32 flex flex-col justify-center w-80",
      ) as Div;

    // Middle column: semifinals
    const semifinalsColumn = new Div(
      new Header(2, "Semifinals").class(
        "text-2xl font-bold text-white mb-4 text-center",
      ),
      new Div(this.semi1Card, this.semi2Card).class(
        "flex flex-col items-center justify-center flex-1 gap-4",
      ),
    ).class("flex flex-col");

    // Right column: final
    const finalColumn = new Div(
      new Header(2, "Final").class(
        "text-2xl font-bold text-white mb-4 text-center",
      ),
      new Div(this.finalCard).class(
        "flex flex-col items-center justify-center flex-1",
      ),
    ).class("flex flex-col");

    // Secondary action: New Tournament (less prominent - using default gray)
    this.newTournamentBtn = new Button(
      new Paragraph("New Tournament").class("py-2 px-6"),
    )
      .class(DEFAULT_BUTTON)
      .class("hidden")
      .withId("new-tournament-btn")
      .withOnclick(() => this.resetTournament()) as Button;

    this.winnerAnnouncement = new Div()
      .withId("winner-announcement")
      .class("hidden mb-6") as Div;

    this.setupScreen = new Div(
      new Header(1, "Local Tournament").class(
        "text-4xl font-bold text-white mb-8",
      ),
      this.winnerAnnouncement,
      new Div(this.startMatchBtn, this.newTournamentBtn).class(
        "flex justify-center gap-4 mb-6",
      ),
      new Div(inputColumn, semifinalsColumn, finalColumn).class(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-16 max-w-6xl mx-auto",
      ),
    ).class(
      "flex flex-col justify-center items-center min-h-screen p-8",
    ) as Div;

    // Bracket display
    this.bracketDisplay = new Div()
      .withId("bracket-display")
      .class("hidden") as Div;

    // Ready overlay - reusable component
    this.readyBtn = new Button(
      new Paragraph("Start Game").class("text-xl py-4 px-12"),
    )
      .class(PRIMARY_BUTTON)
      .withId("ready-btn")
      .withOnclick(() => this.sendReadySignal()) as Button;

    this.readyOverlay = new GameOverlay(
      "!p-8 flex flex-col items-center max-w-md",
      new Paragraph("All players ready?").class(
        "text-2xl font-bold text-white mb-6 text-center",
      ),
      new Paragraph("Game Rules").class(
        "text-sm font-bold text-neutral-300 mb-2 text-center",
      ),
      new Div(
        new Paragraph("First to 7 points wins"),
        new Paragraph("Game ends after 2 minutes"),
        new Paragraph("Own goals lose a point"),
      ).class("mb-6 text-center text-sm text-neutral-400"),
      new Paragraph("Player Controls").class(
        "text-sm font-bold text-neutral-300 mb-2 text-center",
      ),
      new Paragraph("")
        .withId("controls-info")
        .class("text-sm mb-8 text-center"),
      new Div(this.readyBtn).class("flex justify-center"),
    )
      .withId("ready-overlay")
      .class("hidden") as GameOverlay;

    // Game over overlay
    this.backToTournamentBtn = new Button(
      new Paragraph("Back to Tournament").class("py-3 px-8"),
    )
      .class(PRIMARY_BUTTON)
      .withId("back-to-tournament-btn")
      .withOnclick(() => this.returnToTournamentBracket()) as Button;

    this.gameOverScoresDiv = new Div()
      .withId("game-over-scores")
      .class("mb-8") as Div;

    this.gameOverOverlay = new GameOverlay(
      "!p-8 flex flex-col items-center max-w-2xl",
      new Paragraph("Game Over!")
        .withId("game-over-title")
        .class("text-4xl font-bold text-white mb-8 text-center"),
      this.gameOverScoresDiv,
      new Div(this.backToTournamentBtn).class("flex justify-center"),
    )
      .withId("gameover-overlay")
      .class("hidden") as GameOverlay;

    // Game screen
    this.gameScreen = new Div(
      new Div()
        .withId("canvas-container")
        .class("absolute inset-0 bg-gray-900"),

      new Div()
        .withId("game-hud")
        .class("absolute top-0 left-0 right-0 bg-zinc-800 p-4"),

      // Permanent controls display in top right
      (this.controlsDisplay = new Div()
        .withId("controls-display")
        .class(
          "absolute top-24 right-4 bg-black/50 backdrop-blur-sm p-3 rounded-lg flex flex-col gap-2 hidden",
        ) as Div),
      this.readyOverlay,
      this.gameOverOverlay,
      this.bracketDisplay,
    )
      .withId("game-screen")
      .class("relative w-full h-screen overflow-hidden hidden") as Div;

    return [this.setupScreen, this.gameScreen];
  }

  bindEvents(): void {
    APP.headerRoot.style.display = "none";
    this.startBtn.bindEvents();
    this.startMatchBtn.bindEvents();
    this.newTournamentBtn.bindEvents();
    this.readyBtn.bindEvents();
    this.backToTournamentBtn.bindEvents();
    this.playerInputs.forEach((input) => input.bindEvents());

    // Set default value for player 1 and make it readonly
    if (APP.userInfo?.username) {
      const player1Input = this.playerInputs[0].byId() as HTMLInputElement;
      if (player1Input) {
        player1Input.value = APP.userInfo.username;
        player1Input.readOnly = true;
      }
    }

    // Add placeholder text for guest inputs
    for (let i = 1; i < PLAYER_COUNT; i++) {
      (this.playerInputs[i].byId() as HTMLInputElement).placeholder =
        "Enter guest alias";
    }

    // Focus on first guest input Player 2
    (this.playerInputs[1].byId() as HTMLInputElement).focus();

    // Initialise bracket display with placeholder text
    this.updateBracketCards();
  }

  transitionAway(): void {
    this.resetGame();
    this.restoreHeader();
  }

  private async startTournament(): Promise<void> {
    // Read player names from inputs
    for (let i = 0; i < PLAYER_COUNT; i++) {
      const input = this.playerInputs[i].byId() as HTMLInputElement;
      if (input) {
        this.playerNames[i] = input.value;
      }
    }

    // Validate all names entered
    if (this.playerNames.some((name) => !name.trim())) {
      alert("Please enter names for all 4 players");
      return;
    }

    // Check for duplicate names
    const trimmedNames = this.playerNames.map((name) =>
      name.trim().toLowerCase(),
    );
    const uniqueNames = new Set(trimmedNames);
    if (uniqueNames.size !== this.playerNames.length) {
      alert("Player names must be unique");
      return;
    }

    // Randomize bracket
    const playerIndices = [0, 1, 2, 3];
    for (let i = playerIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerIndices[i], playerIndices[j]] = [
        playerIndices[j],
        playerIndices[i],
      ];
    }
    this.semi1Players = [playerIndices[0], playerIndices[1]];
    this.semi2Players = [playerIndices[2], playerIndices[3]];

    // Set tournament state and update bracket to show matchups
    this.tournamentState = "semi1";

    // Disable inputs and start button
    this.playerInputs.forEach((input) => {
      const el = input.byId() as HTMLInputElement;
      if (el) {
        el.readOnly = true;
        el.classList.add("cursor-not-allowed", "opacity-75", "bg-zinc-900");
        el.classList.remove("bg-zinc-800");
      }
    });
    const startBtn = this.startBtn.byId();
    if (startBtn) startBtn.style.display = "none";

    // Update the bracket cards to show the matchups with start button
    this.updateBracketCards();
  }

  private async startGame(playerIndices: [number, number]): Promise<void> {
    console.log("startGame called with playerIndices:", playerIndices);

    // Store current player indices for later use
    this.currentPlayerIndices = playerIndices;

    // Ensure all overlays are hidden at start
    const gameOverElement = this.gameOverOverlay.byId();
    if (gameOverElement) gameOverElement.classList.add("hidden");

    const readyElement = this.readyOverlay.byId();
    if (readyElement) readyElement.classList.add("hidden");

    // Hide setup screen and show game screen
    this.setupScreen.byId()?.classList.add("hidden");
    this.gameScreen.byId()?.classList.remove("hidden");

    const container = document.getElementById("canvas-container");
    if (!container) {
      console.error("Canvas container not found");
      return;
    }

    try {
      // Create local game with 2 players
      this.gameKeys = await createLocalGame(2);
      console.log("Game created with keys:", this.gameKeys);
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Failed to create game. Please try again.");
      // Show setup screen again
      this.setupScreen.byId()?.classList.remove("hidden");
      this.gameScreen.byId()?.classList.add("hidden");
      return;
    }

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

    this.gameInstance = new PongApp(
      wsUrl,
      this.gameKeys[0].key,
      undefined, // not sending user Id as is a local game
      this.gameKeys[1].key,
    );

    this.setupGameListeners(playerIndices);
    this.createGameHUD(playerIndices);

    // Update controls info with colored player names
    this.updateControlsInfo(playerIndices);

    // Show ready overlay
    this.readyOverlay.byId()?.classList.remove("hidden");

    canvas.focus();
  }

  private updateControlsInfo(playerIndices: [number, number]): void {
    const controlsInfo = document.getElementById("controls-info");
    if (!controlsInfo) return;

    const CONTROL_KEYS = ["W/S", "J/U"];
    const elements: AElement[] = [];

    for (let i = 0; i < 2; i++) {
      if (i > 0) elements.push(new Inline("  |  "));
      const playerIdx = playerIndices[i];
      const playerName = this.playerNames[playerIdx];
      // Use paddle position (i) for color, not tournament position (playerIdx)
      elements.push(
        new ColoredText(playerName, PLAYER_COLOURS[i]),
        new Inline(`: ${CONTROL_KEYS[i]}`),
      );
    }

    controlsInfo.innerHTML = elements.map((e) => e.render()).join("");
  }

  private sendReadySignal(): void {
    if (!this.gameInstance) return;

    // Send ready signal for both players
    [this.gameInstance.player1, this.gameInstance.player2]
      .filter(
        (p): p is NonNullable<typeof p> =>
          p !== undefined && p.ws.readyState === WebSocket.OPEN,
      )
      .forEach((p) => {
        p.ws.send(JSON.stringify({ type: "ready" }));
        console.log("Sent ready for player");
      });

    // Hide ready overlay
    this.readyOverlay.byId()?.classList.add("hidden");

    // Show permanent controls display
    this.updatePermanentControls();

    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    if (canvas) canvas.focus();

    this.startUIUpdates();
  }

  private updatePermanentControls(): void {
    const controlsDisplayEl = this.controlsDisplay.byId();
    if (!controlsDisplayEl) return;

    const controlElements: AElement[] = [
      new Paragraph("Controls").class(
        "text-xs font-bold text-neutral-300 mb-2",
      ),
    ];

    for (let i = 0; i < 2; i++) {
      // Use paddle position (i) for color, not tournament position
      const colour = PLAYER_COLOURS[i];
      const playerIdx = this.currentPlayerIndices[i];
      const playerName = this.playerNames[playerIdx];
      controlElements.push(
        new Div(
          new Div()
            .class("w-6 h-6 rounded-full")
            .withStyle(`background: ${colour}`),
          new Inline(`${playerName}: ${this.CONTROL_KEYS[i]}`).class(
            "text-xs text-neutral-300",
          ),
        ).class("flex items-center gap-2"),
      );
    }

    this.controlsDisplay.contents = controlElements;
    this.controlsDisplay.redrawInner();
    controlsDisplayEl.classList.remove("hidden");
  }

  private createGameHUD(playerIndices: [number, number]): void {
    const hudContainer = document.getElementById("game-hud");
    if (!hudContainer || !this.gameInstance) return;

    const players = [
      new PlayerAvatar(
        this.playerNames[playerIndices[0]],
        "score-0",
        PLAYER_COLOURS[0], // Always use paddle color 0 for left player
        "left",
      ),
      new PlayerAvatar(
        this.playerNames[playerIndices[1]],
        "score-1",
        PLAYER_COLOURS[1], // Always use paddle color 1 for right player
        "right",
      ),
    ];

    hudContainer.innerHTML = new GameHUD(players)
      .withId("game-hud-content")
      .render();
  }

  private setupGameListeners(playerIndices: [number, number]): void {
    if (!this.gameInstance?.sock) return;

    const originalHandler = this.gameInstance.sock.onmessage;
    this.gameInstance.sock.onmessage = (ev: MessageEvent) => {
      originalHandler?.call(this.gameInstance!.sock, ev);

      try {
        const msg = JSON.parse(ev.data);

        if (msg.type === "game_start") {
          this.startUIUpdates();
        }

        if (msg.type === "game_end") {
          this.onGameEnd(msg, playerIndices);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
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

  private onGameEnd(msg: any, playerIndices: [number, number]): void {
    if ((this as any).updateIntervalId) {
      clearInterval((this as any).updateIntervalId);
      delete (this as any).updateIntervalId;
    }

    const players =
      msg.players?.length > 0 ?
        msg.players
      : this.gameInstance?.gameState?.players;
    if (!players) return;

    const player1Id =
      playerIndices[0] === 0 ?
        APP.userInfo!.id
      : this.playerNames[playerIndices[0]];
    const player2Id =
      playerIndices[1] === 0 ?
        APP.userInfo!.id
      : this.playerNames[playerIndices[1]];

    // Determine winner: if player 1 (index 0 in game) won, use player1Id, else use player2Id
    const winnerId =
      players[0].score > players[1].score ? player1Id : player2Id;

    const result: GameResult = {
      gameId: this.gameKeys[0].gameId,
      players: [
        { id: player1Id, score: players[0].score },
        { id: player2Id, score: players[1].score },
      ],
      winnerId: winnerId,
      duration: msg.duration || 0,
    };

    this.handleGameResult(result, playerIndices);
  }

  // Handle match completion based on current tournament stage
  private async handleGameResult(
    result: GameResult,
    playerIndices: [number, number],
  ): Promise<void> {
    switch (this.tournamentState) {
      case "semi1": {
        this.semi1Result = result;
        let winnerIndex: number;
        if (result.players[0].score === result.players[1].score) {
          // Draws in semifinals are resolved randomly
          winnerIndex =
            Math.random() < 0.5 ? playerIndices[0] : playerIndices[1];
          result.winnerId =
            winnerIndex === playerIndices[0] ?
              result.players[0].id
            : result.players[1].id;
        } else {
          winnerIndex =
            result.winnerId === result.players[0].id ?
              playerIndices[0]
            : playerIndices[1];
        }
        this.finalPlayers[0] = winnerIndex;
        this.tournamentState = "semi2";
        this.showGameOver(result, playerIndices);
        break;
      }

      case "semi2": {
        this.semi2Result = result;
        let winnerIndex: number;
        if (result.players[0].score === result.players[1].score) {
          winnerIndex =
            Math.random() < 0.5 ? playerIndices[0] : playerIndices[1];
          result.winnerId =
            winnerIndex === playerIndices[0] ?
              result.players[0].id
            : result.players[1].id;
        } else {
          winnerIndex =
            result.winnerId === result.players[0].id ?
              playerIndices[0]
            : playerIndices[1];
        }
        this.finalPlayers[1] = winnerIndex;
        this.tournamentState = "final";
        this.showGameOver(result, playerIndices);
        break;
      }

      case "final": {
        this.finalResult = result;

        // Draw in final uses tiebreaker: total semifinal goals, then random
        if (result.players[0].score === result.players[1].score) {
          const finalPlayer1Index = playerIndices[0];
          const finalPlayer2Index = playerIndices[1];

          let player1SemiScore = 0;
          let player2SemiScore = 0;

          // Look up each finalist's score from their semifinal
          if (this.semi1Result) {
            const player1InSemi1 = this.semi1Players.indexOf(finalPlayer1Index);
            const player2InSemi1 = this.semi1Players.indexOf(finalPlayer2Index);
            if (player1InSemi1 !== -1) {
              player1SemiScore = this.semi1Result.players[player1InSemi1].score;
            }
            if (player2InSemi1 !== -1) {
              player2SemiScore = this.semi1Result.players[player2InSemi1].score;
            }
          }

          // Check semi2 for each player
          if (this.semi2Result) {
            const player1InSemi2 = this.semi2Players.indexOf(finalPlayer1Index);
            const player2InSemi2 = this.semi2Players.indexOf(finalPlayer2Index);
            if (player1InSemi2 !== -1) {
              player1SemiScore = this.semi2Result.players[player1InSemi2].score;
            }
            if (player2InSemi2 !== -1) {
              player2SemiScore = this.semi2Result.players[player2InSemi2].score;
            }
          }

          if (player1SemiScore > player2SemiScore) {
            result.winnerId = result.players[0].id;
          } else if (player2SemiScore > player1SemiScore) {
            result.winnerId = result.players[1].id;
          } else {
            // Semifinal scores also tied, use random
            result.winnerId =
              Math.random() < 0.5 ? result.players[0].id : result.players[1].id;
          }
        }

        this.tournamentState = "finished";
        this.showGameOver(result, playerIndices);
        break;
      }

      default:
        break;
    }
  }

  private showGameOver(
    result: GameResult,
    playerIndices: [number, number],
  ): void {
    // Stop UI updates
    if ((this as any).updateIntervalId) {
      clearInterval((this as any).updateIntervalId);
      delete (this as any).updateIntervalId;
    }

    // Hide ready overlay if it's showing
    this.readyOverlay.byId()?.classList.add("hidden");

    // Create finalScores array
    const finalScores = [
      {
        player: 1,
        score: result.players[0].score,
        name: this.playerNames[playerIndices[0]],
      },
      {
        player: 2,
        score: result.players[1].score,
        name: this.playerNames[playerIndices[1]],
      },
    ];

    // Sort by score (highest first)
    const sorted = [...finalScores].sort((a, b) => b.score - a.score);
    const topScore = sorted[0].score;
    const winners = sorted.filter((s) => s.score === topScore);

    // Build winner announcement using Elements
    let winnerElement: AElement;
    if (winners.length > 1) {
      const names = winners.map((w) => w.name).join(" & ");
      winnerElement = new Div(
        new Paragraph("Draw!").class("text-2xl font-bold mb-2 text-yellow-400"),
        new Paragraph(names).class("text-lg text-white"),
      ).class("mb-6 text-center");
    } else {
      const winner = winners[0];
      const colour = PLAYER_COLOURS[winner.player - 1];
      winnerElement = new Div(
        new Paragraph(`${winner.name} Wins!`)
          .class("text-2xl font-bold mb-2")
          .withStyle(`color: ${colour}`),
      ).class("mb-6 text-center");
    }

    // Build scores list
    const scoreElements = sorted.map((s) => {
      const colour = PLAYER_COLOURS[s.player - 1];
      return new Div(
        new Div(
          new Div()
            .class("w-10 h-10 rounded-full outline outline-2")
            .withStyle(`background: ${colour}; outline-color: ${colour}`),
          new Paragraph(s.name).class("text-xl font-bold text-white"),
        ).class("flex items-center gap-4"),
        new Paragraph(String(s.score))
          .class("text-3xl font-bold")
          .withStyle(`color: ${colour}`),
      ).class(
        "flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-2",
      );
    });

    this.gameOverScoresDiv.contents = [winnerElement, ...scoreElements];
    this.gameOverScoresDiv.contents.forEach((x) => x.class("min-w-90"));
    this.gameOverScoresDiv.redrawInner();

    // Show game over overlay
    this.gameOverOverlay.byId()?.classList.remove("hidden");
  }

  private returnToTournamentBracket(): void {
    // Hide game over overlay
    this.gameOverOverlay.byId()?.classList.add("hidden");

    // Hide controls display
    this.controlsDisplay.byId()?.classList.add("hidden");

    // Hide game screen and show setup screen with updated bracket
    this.gameScreen.byId()?.classList.add("hidden");
    this.setupScreen.byId()?.classList.remove("hidden");
    this.resetGame();
    this.updateBracketDisplay();

    // If tournament is finished, show winner
    if (this.tournamentState === "finished") {
      this.showTournamentWinner();
    }
  }

  private updateBracketCards(): void {
    // Helper to create match card content
    const createMatchContent = (
      p1Idx: number,
      p2Idx: number,
      result: GameResult | null,
    ): AElement[] => {
      const p1Name = this.playerNames[p1Idx] || `Player ${p1Idx + 1}`;
      const p2Name = this.playerNames[p2Idx] || `Player ${p2Idx + 1}`;

      if (!result) {
        // Show matchup with avatars before game starts - same format as game over screen (no background)
        const p1Color = PLAYER_COLOURS[p1Idx];
        const p2Color = PLAYER_COLOURS[p2Idx];

        const player1Row = new Div(
          new Div(
            new Div()
              .class("w-10 h-10 rounded-full outline outline-2")
              .withStyle(`background: ${p1Color}; outline-color: ${p1Color}`),
            new Paragraph(p1Name).class(
              "text-xl font-bold text-white truncate max-w-[300px]",
            ),
          ).class("flex items-center gap-4 min-w-0 flex-1"),
          new Paragraph("-").class("text-3xl font-bold text-neutral-700"),
        ).class("flex items-center justify-between py-2");

        const vsDiv = new Paragraph("vs").class(
          "text-neutral-500 font-bold text-xl text-center my-2",
        );

        const player2Row = new Div(
          new Div(
            new Div()
              .class("w-10 h-10 rounded-full outline outline-2")
              .withStyle(`background: ${p2Color}; outline-color: ${p2Color}`),
            new Paragraph(p2Name).class(
              "text-xl font-bold text-white truncate max-w-[300px]",
            ),
          ).class("flex items-center gap-4 min-w-0 flex-1"),
          new Paragraph("-").class("text-3xl font-bold text-neutral-700"),
        ).class("flex items-center justify-between py-2");

        return [new Div(player1Row, vsDiv, player2Row).class("flex flex-col")];
      } else {
        // Show result with scores - same format as game over screen (no background)
        const p1Score = result.players[0].score;
        const p2Score = result.players[1].score;
        const winnerIdx =
          result.winnerId === result.players[0].id ? p1Idx : p2Idx;
        const p1Color = PLAYER_COLOURS[p1Idx];
        const p2Color = PLAYER_COLOURS[p2Idx];

        return [
          new Div(
            new Div(
              new Div()
                .class("w-10 h-10 rounded-full outline outline-2")
                .withStyle(`background: ${p1Color}; outline-color: ${p1Color}`),
              new Paragraph(p1Name).class(
                "text-xl font-bold text-white truncate max-w-[300px]",
              ),
            ).class("flex items-center gap-4 min-w-0 flex-1"),
            new Paragraph(String(p1Score))
              .class("text-3xl font-bold")
              .withStyle(`color: ${p1Color}`),
          ).class(
            `flex items-center justify-between py-2 ${winnerIdx === p1Idx ? "opacity-100" : "opacity-50"}`,
          ),

          new Div(
            new Div(
              new Div()
                .class("w-10 h-10 rounded-full outline outline-2")
                .withStyle(`background: ${p2Color}; outline-color: ${p2Color}`),
              new Paragraph(p2Name).class(
                "text-xl font-bold text-white truncate max-w-[300px]",
              ),
            ).class("flex items-center gap-4 min-w-0 flex-1"),
            new Paragraph(String(p2Score))
              .class("text-3xl font-bold")
              .withStyle(`color: ${p2Color}`),
          ).class(
            `flex items-center justify-between py-2 ${winnerIdx === p2Idx ? "opacity-100" : "opacity-50"}`,
          ),
        ];
      }
    };

    // Update semifinal 1
    if (this.tournamentState === "setup") {
      this.semi1Card.contents = [
        new Paragraph("-").class("text-neutral-500 text-center"),
      ];
      this.semi1Card.removeClass("outline-pink-500");
      this.semi1Card.class("outline-neutral-700");
    } else {
      this.semi1Card.contents = createMatchContent(
        this.semi1Players[0],
        this.semi1Players[1],
        this.semi1Result,
      );
      // Highlight active card
      if (this.tournamentState === "semi1" && !this.semi1Result) {
        this.semi1Card.removeClass("outline-neutral-700");
        this.semi1Card.class("outline-pink-500");
      } else {
        this.semi1Card.removeClass("outline-pink-500");
        this.semi1Card.class("outline-neutral-700");
      }
    }
    this.semi1Card.redrawInner();

    // Update semifinal 2
    if (this.tournamentState === "setup") {
      this.semi2Card.contents = [
        new Paragraph("-").class("text-neutral-500 text-center"),
      ];
      this.semi2Card.removeClass("outline-pink-500");
      this.semi2Card.class("outline-neutral-700");
    } else {
      this.semi2Card.contents = createMatchContent(
        this.semi2Players[0],
        this.semi2Players[1],
        this.semi2Result,
      );
      // Highlight active card
      if (this.tournamentState === "semi2" && !this.semi2Result) {
        this.semi2Card.removeClass("outline-neutral-700");
        this.semi2Card.class("outline-pink-500");
      } else {
        this.semi2Card.removeClass("outline-pink-500");
        this.semi2Card.class("outline-neutral-700");
      }
    }
    this.semi2Card.redrawInner();

    // Update final
    if (
      this.tournamentState === "setup"
      || !this.semi1Result
      || !this.semi2Result
    ) {
      this.finalCard.contents = [
        new Paragraph("-").class("text-neutral-500 text-center"),
      ];
      this.finalCard.removeClass("outline-pink-500");
      this.finalCard.class("outline-neutral-700");
    } else {
      this.finalCard.contents = createMatchContent(
        this.finalPlayers[0],
        this.finalPlayers[1],
        this.finalResult,
      );
      // Highlight active card
      if (this.tournamentState === "final" && !this.finalResult) {
        this.finalCard.removeClass("outline-neutral-700");
        this.finalCard.class("outline-pink-500");
      } else {
        this.finalCard.removeClass("outline-pink-500");
        this.finalCard.class("outline-neutral-700");
      }
    }
    this.finalCard.redrawInner();

    // Update the start match button
    this.updateStartMatchButton();
  }

  private updateStartMatchButton(): void {
    const btnEl = this.startMatchBtn.byId();
    if (!btnEl) return;

    switch (this.tournamentState) {
      case "semi1":
        if (!this.semi1Result) {
          this.startMatchBtn.contents = [
            new Paragraph("Start Semifinal 1").class("py-3 px-8"),
          ];
          this.startMatchBtn.redrawInner();
          btnEl.classList.remove("hidden");
          btnEl.onclick = () => this.navigateToGame(this.semi1Players);
        } else {
          btnEl.classList.add("hidden");
        }
        break;

      case "semi2":
        if (!this.semi2Result) {
          this.startMatchBtn.contents = [
            new Paragraph("Start Semifinal 2").class("py-3 px-8"),
          ];
          this.startMatchBtn.redrawInner();
          btnEl.classList.remove("hidden");
          btnEl.onclick = () => this.navigateToGame(this.semi2Players);
        } else {
          btnEl.classList.add("hidden");
        }
        break;

      case "final":
        if (!this.finalResult) {
          this.startMatchBtn.contents = [
            new Paragraph("Start Final").class("py-3 px-8"),
          ];
          this.startMatchBtn.redrawInner();
          btnEl.classList.remove("hidden");
          btnEl.onclick = () => this.navigateToGame(this.finalPlayers);
        } else {
          btnEl.classList.add("hidden");
        }
        break;

      default:
        btnEl.classList.add("hidden");
        break;
    }
  }

  private navigateToGame(playerIndices: [number, number]): void {
    console.log("navigateToGame called with:", playerIndices);
    // Start the game directly instead of navigating
    this.startGame(playerIndices);
  }

  private updateBracketDisplay(): void {
    this.updateBracketCards();
  }

  private showTournamentWinner(): void {
    if (!this.finalResult) return;

    // Find the winner's index
    const winnerIdx = this.playerNames.findIndex(
      (_, i) =>
        (i === 0 ? APP.userInfo!.id : this.playerNames[i])
        === this.finalResult!.winnerId,
    );
    const winnerName = this.playerNames[winnerIdx];
    const winnerColor = PLAYER_COLOURS[winnerIdx];

    // Show winner announcement using Elements
    this.winnerAnnouncement.contents = [
      new Div(
        new Paragraph(`${winnerName} Wins the Tournament!`)
          .class("text-3xl font-bold mb-2")
          .withStyle(`color: ${winnerColor}`),
      ).class("text-center"),
    ];
    this.winnerAnnouncement.redrawInner();
    this.winnerAnnouncement.byId()?.classList.remove("hidden");

    const newTournamentBtn = this.newTournamentBtn.byId();
    if (newTournamentBtn) {
      newTournamentBtn.classList.remove("hidden");
    }

    const startMatchBtn = this.startMatchBtn.byId();
    if (startMatchBtn) {
      startMatchBtn.classList.add("hidden");
    }

    // Restore header when tournament is finished
    APP.headerRoot.style.display = "";
  }

  private resetGame(): void {
    if ((this as any).updateIntervalId) {
      clearInterval((this as any).updateIntervalId);
      delete (this as any).updateIntervalId;
    }

    if (this.gameInstance) {
      this.gameInstance.dispose();
      this.gameInstance = null;
    }

    const container = document.getElementById("canvas-container");
    if (container) container.innerHTML = "";

    const hudContainer = document.getElementById("game-hud");
    if (hudContainer) hudContainer.innerHTML = "";
  }

  private restoreHeader(): void {
    APP.headerRoot.style.display = "";
  }
}
