import {
  Engine, Scene, ArcRotateCamera, Vector3,
  HemisphericLight, Mesh, MeshBuilder,
  Camera, Vector2, StandardMaterial, Color3,
  KeyboardEventTypes,
  BloomEffect,
} from "@babylonjs/core";

const BALL_RADIUS = 0.3;
const FIELD_HALFSIZE = 64000;
const DOWNSCALE = 8000;

type GameParams = {
  nPlayers: number;
  coop: boolean;
  ballSpeed: number;
  paddleSize: number;
  paddleSpeed: number;
  paddleInertia: number;
  paddleFriction: number;
  paddleBounceAngle: number;
  timeLimitMs: number;
  fieldSize: 128000;
  tickMs: 20;
  startingHealth?: number | undefined;
  pointsTarget?: number | undefined;
};

export type PlayerInput = {
  seq: number,
  time: number,
  up: boolean,
  down: boolean,
};
type PlayerState = {
  pos: number,
  vel: number,
  health: number,
  score: number,
  hitBy?: number,
};
type GameState = {
  pauseCd: number,  // Number of ticks remaining in countdown
  tick: number,
  time: number,
  players: PlayerState[],
  ball: {
    pos: Vector2,
    vel: Vector2,
    lastRefl?: number,
  },
};

const lerp = (a: number, b: number, l: number): number => {
  return a + l * (b - a);
};

type PlayerController = {
  upKey: string,
  downKey: string,
  state: PlayerInput,
  ws: WebSocket,
};

export class PongApp {
  canvas: HTMLCanvasElement;
  engine: Engine;
  scene: Scene;

  camera: Camera;

  ground: Mesh;
  ball: Mesh;
  paddles: Mesh[] = [];
  walls: Mesh[] = [];
  light: HemisphericLight;

  sock: WebSocket;

  myPid!: number; // position
  myUserId?: number;
  isViewer: boolean;
  isLocal: boolean;
  params!: GameParams;
  playerUserIds: Map<number, number | null> = new Map(); // Map of positionId -> userId

  tickAvg: number[] = [];
  lastTime!: number;

  prevState?: GameState;
  gameState!: GameState;

  player1!: PlayerController;
  player2?: PlayerController;
  player3?: PlayerController;
  player4?: PlayerController;

  // takes base address, join token, their userid (if registered), then up to 3 other tokens for guests
  constructor(addr: string, token: string, userId?: number, t2?: string, t3?: string, t4?: string) {
    this.isViewer = token.startsWith("view_");
    if (this.isViewer) {
      console.log("Entered babylon constructor: viewer");
    }
    this.myUserId = userId;
    this.isLocal = !!(t2 || t3 || t4);
    this.isLocal ? console.log("Babylon constructor: local game") : console.log("Babylon constructor: online game");

    // ADDED TO SENT THEIR USERID 
    const wsUrl = userId ? `${addr}?token=${token}&userId=${userId}` : `${addr}?token=${token}`;
    console.log(wsUrl);
    this.sock = new WebSocket(wsUrl);

    const canvas = document.getElementById("gameCanvas") as any as HTMLCanvasElement;

    this.canvas = canvas;

    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);

    this.player1 = {
      upKey: 's',
      downKey: 'w',
      state: {
        down: false,
        up: false,
        seq: -1,
        time: Date.now(),
      },
      ws: this.sock,
    };

    // MULTI-PLAYER SAME KEYBOARD MODE: only if t2 is provided
    if (t2) {
      console.log(`${addr}?token=${t2}`);
      const sock2 = new WebSocket(`${addr}?token=${t2}`);
      this.player2 = {
        upKey: 'u',
        downKey: 'j',
        state: {
          down: false,
          up: false,
          seq: -1,
          time: Date.now(),
        },
        ws: sock2,
      };
    }

    if (t3) {
      console.log(`${addr}?token=${t3}`);
      const q = new WebSocket(`${addr}?token=${t3}`);
      this.player3 = {
        upKey: "y",
        downKey: "t",
        state: {
          down: false,
          up: false,
          seq: -1,
          time: Date.now(),
        },
        ws: q
      };
    }
    if (t4) {
      console.log(`${addr}?token=${t4}`);
      const q = new WebSocket(`${addr}?token=${t4}`);
      this.player4 = {
        upKey: "v",
        downKey: "b",
        state: {
          down: false,
          up: false,
          seq: -1,
          time: Date.now(),
        },
        ws: q
      };
    }

    this.sock.onmessage = this.onMsg.bind(this);

    // ADDED: ONLY IF IT'S A PLAYER SET UP THE KEY EVENTS
    if (!this.isViewer) {
      this.scene.onKeyboardObservable.add((kbInfo) => {
        [this.player1, this.player2, this.player3, this.player4].forEach((p) => {
          if (!p) return;
          switch (kbInfo.type) {
            case KeyboardEventTypes.KEYDOWN:
              switch (kbInfo.event.key) {
                case p.downKey:
                  p.state.down = true;
                  break;
                case p.upKey:
                  p.state.up = true;
                  break;
              }
              break;
            case KeyboardEventTypes.KEYUP:
              switch (kbInfo.event.key) {
                case p.downKey:
                  p.state.down = false;
                  break;
                case p.upKey:
                  p.state.up = false;
                  break;
              }
              break;
          }
        });
      });
    }

    this.camera = new ArcRotateCamera(
      "Camera", Math.PI / 4, Math.PI / 4, 32, Vector3.Zero(), this.scene);
    this.camera.attachControl(this.canvas, true);

    this.light = new HemisphericLight("light", new Vector3(0.12, 0.78, 0.33), this.scene);

    this.ball = MeshBuilder.CreateSphere("ball", { diameter: BALL_RADIUS * 2 }, this.scene);
    this.ball.material = new StandardMaterial("ballMaterial");
    (this.ball.material as StandardMaterial).specularColor = new Color3(0.1, 0.1, 0.1);

    this.ground = MeshBuilder.CreatePlane("ground", {
      width: BALL_RADIUS * 2 + FIELD_HALFSIZE * 2 / DOWNSCALE,
      height: BALL_RADIUS * 2 + FIELD_HALFSIZE * 2 / DOWNSCALE,
    }, this.scene);
    this.ground.position.y = -BALL_RADIUS;
    this.ground.rotate(new Vector3(1, 0, 0), Math.PI / 2);
    const groundMat = new StandardMaterial(
      "ground_mat", this.scene, false
    );
    groundMat.diffuseColor = new Color3(0.25, 0.25, 0.25);
    groundMat.specularColor = new Color3(0.15, 0.15, 0.15);
    this.ground.material = groundMat;
    console.log("BABYLON: about to create the boxes");

    for (let i = 0; i < 4; i++) {
      const wall = MeshBuilder.CreateBox(`wall_${i}`);
      this.walls.push(wall);
      wall.material = this.ground.material;
      if (i % 2 === 0) {
        wall.scaling.x = FIELD_HALFSIZE * 2 / DOWNSCALE + 1 + 2 * BALL_RADIUS;
        wall.position.x += 0.5;
        wall.position.z = FIELD_HALFSIZE / DOWNSCALE + 0.5 + BALL_RADIUS;
        if (i === 0) {
          wall.position.z *= -1;
          wall.position.x *= -1;
        }
      } else {
        wall.scaling.z = FIELD_HALFSIZE * 2 / DOWNSCALE + 1 + 2 * BALL_RADIUS;
        wall.position.z += 0.5;
        wall.position.x = FIELD_HALFSIZE / DOWNSCALE + 0.5 + BALL_RADIUS;
        if (i === 1) {
          wall.position.x *= -1;
        } else {
          wall.position.z *= -1;
        }
      }
    }
  }

  sendInput(ctrl: PlayerController) {
    ctrl.state.seq++;
    ctrl.state.time = Date.now();
    ctrl.ws.send(JSON.stringify(ctrl.state));
  }

  startRenderLoop() {
    this.engine.runRenderLoop(() => {
      if (!this.isViewer) this.sendInput(this.player1);
      if (this.player2) this.sendInput(this.player2);
      if (this.player3) this.sendInput(this.player3);
      if (this.player4) this.sendInput(this.player4);
      if (this.prevState) {
        // Update player list UI to show current scores -- REMOVE THIS AND JUST LEAVE BABYLON AS PURE GAME RENDER AND ADD UI SEPARATELY??
        this.updatePlayerListUI();

        const debugtext = document.getElementById("debugtext");
        if (debugtext) {
          // Show scores for all players
          const scores = this.gameState.players.map(p => p.score).join('  ');
          // show count down
          if (this.gameState.pauseCd > 0) {
            const countdownSeconds = Math.ceil(this.gameState.pauseCd * this.params.tickMs / 1000);
            debugtext.textContent = `${scores}  |  ${countdownSeconds}`;
          } else {
            debugtext.textContent = `${scores}  |  ${Math.floor(this.gameState.time / 1000)}`;
          }
        }
        if (typeof this.prevState.ball.lastRefl === "number") {
          (this.ball.material as StandardMaterial).diffuseColor
            = PLAYER_COLORS[this.prevState.ball.lastRefl];
        }
        const avgTime = this.tickAvg.reduce((p, c) => p + c, 0) / this.tickAvg.length;
        const lt = Date.now();
        const dt = Math.min(4, (lt - this.lastTime) / avgTime);
        if (!dt) {
          return;
        }
        let x = lerp(this.prevState.ball.pos.x + this.prevState.ball.vel.x * dt,
          this.gameState.ball.pos.x + this.gameState.ball.vel.x * (dt - 1), dt);
        let y = lerp(this.prevState.ball.pos.y + this.prevState.ball.vel.y * dt,
          this.gameState.ball.pos.y + this.gameState.ball.vel.y * (dt - 1), dt);
        this.ball.position.x = x / DOWNSCALE;
        this.ball.position.z = y / DOWNSCALE;
        for (let i = 0; i < this.params.nPlayers; i++) {
          // TODO(vaiva)
          const ppl = this.prevState.players[i];
          const cpl = this.gameState.players[i];
          const pos = lerp(ppl.pos + ppl.vel * dt,
            cpl.pos + cpl.vel * (dt - 1), dt);
          if (i <= 1) {
            this.paddles[i].position.z = pos / DOWNSCALE;
            if (i === 1) {
              this.paddles[i].position.z *= -1;
            }
          } else {
            this.paddles[i].position.x = pos / DOWNSCALE;
            if (i === 2) {
              this.paddles[i].position.x *= -1;
            }
          }
          (this.walls[i].material as StandardMaterial).diffuseColor
            = Color3.Lerp((this.walls[i].material as StandardMaterial).diffuseColor,
              new Color3(0.25, 0.25, 0.25), 0.1);
          if (typeof ppl.hitBy === 'number') {
            let color = PLAYER_COLORS[ppl.hitBy];
            // red flash for own goals (any player hit their own wall)
            if (ppl.hitBy === i) {
              color = Color3.Red();
            }
            (this.walls[i].material as StandardMaterial).diffuseColor
              = color;
          }
        }
      }
      this.scene.render();
    });
  }

  onMsg(ev: MessageEvent) {
    let msg = JSON.parse(ev.data);
    if (msg.type === "state") {
      this.lastTime = Date.now();
      this.prevState = this.gameState;
      this.gameState = msg.state;
      if (this.prevState) {
        this.tickAvg.shift();
        this.tickAvg.push(this.gameState.time - this.prevState.time);
      }
    } else if (msg.type === "player_list") {
      console.log("Received player list:", msg.players);
      msg.players.forEach((p: { pid: number; userId: number | null }) => {
        this.playerUserIds.set(p.pid, p.userId);
      });
      // update UI to show who's in the game
      this.updatePlayerListUI();
    } else if (msg.type === "game_join") { // for yourself joining
      this.params = msg.params;
      this.tickAvg.fill(this.params.tickMs, 0, 12);

      if (msg.isViewer) {
        console.log("Joined as viewer");
        this.isViewer = true;
        this.myPid = -1;
      } else {
        this.myPid = msg.pid;
      }

      for (let i = 0; i < this.params.nPlayers; i++) {
        const paddle = MeshBuilder.CreateBox(`player_${i}`, {}, this.scene);
        const mat = new StandardMaterial(`paddleMat_${i}`, this.scene);
        paddle.material = mat;
        mat.diffuseColor = PLAYER_COLORS[i];
        mat.specularColor = new Color3(0.15, 0.15, 0.15);
        switch (i) {
          case 0:
            paddle.scaling.z = this.params.paddleSize / DOWNSCALE;
            paddle.scaling.y = 1.05;
            paddle.scaling.x = 1.05;
            paddle.position.x = FIELD_HALFSIZE / DOWNSCALE + 0.5 + BALL_RADIUS;
            break;
          case 1:
            paddle.scaling.z = this.params.paddleSize / DOWNSCALE;
            paddle.scaling.y = 1.05;
            paddle.scaling.x = 1.05;
            paddle.position.x = -(FIELD_HALFSIZE / DOWNSCALE + 0.5 + BALL_RADIUS);
            break;
          case 2:
            paddle.scaling.x = this.params.paddleSize / DOWNSCALE;
            paddle.scaling.y = 1.05;
            paddle.scaling.z = 1.05;
            paddle.position.z = (FIELD_HALFSIZE / DOWNSCALE + 0.5 + BALL_RADIUS);
            break;
          case 3:
            paddle.scaling.x = this.params.paddleSize / DOWNSCALE;
            paddle.scaling.y = 1.05;
            paddle.scaling.z = 1.05;
            paddle.position.z = -(FIELD_HALFSIZE / DOWNSCALE + 0.5 + BALL_RADIUS);
            break;
        };
        this.paddles.push(paddle);
      }

      // REMOTE GAMES rotating camera so player is always on the left
      if (!this.isLocal && !this.isViewer) {
        this.rotateCameraForPlayer(this.myPid);
      }

      this.engine.runRenderLoop(() => {
        this.scene.render();
      });
    } else if (msg.type === "player_ready") {
      console.log(`Player ${msg.pid} is ready`);
    } else if (msg.type === "game_start") {
      this.lastTime = Date.now();
      this.engine.stopRenderLoop();
      this.startRenderLoop();
    } else if (msg.type === "game_end") {
      if (this.gameState && msg.players) {
        msg.players.forEach((player: any, idx: number) => {
          if (this.gameState.players[idx]) {
            this.gameState.players[idx].score = player.score;
          }
        });
        this.updatePlayerListUI();
      }
      this.engine.stopRenderLoop();
    } else if (msg.type === "game_abandoned") {
      console.log("Game abandoned:", msg.reason);
      this.engine.stopRenderLoop();

      const debugtext = document.getElementById("debugtext");
      if (debugtext) {
        debugtext.textContent = "Game Abandoned: " + msg.reason;
        debugtext.style.color = "#ff9800";
      }

    } else {
      console.log("[WARN]: Unknown msg", msg);
    }
  }

  // rotating camera so see themself on left from their perspective (for remote games)
  rotateCameraForPlayer(pid: number) {
    const rotations = {
      0: 0, // No rotation needed
      1: Math.PI, // 180
      2: Math.PI / 2, // +90
      3: (3 * Math.PI) / 2 // -90
    };

    const rotation = rotations[pid as keyof typeof rotations];
    if (rotation !== undefined && rotation !== 0) {
      (this.camera as ArcRotateCamera).alpha += rotation;
      console.log(`Camera rotated ${(rotation * 180 / Math.PI).toFixed(0)} dgs for player ${pid}`);
    }
  }

  // lil debug to see status of who's there, their user id, their score etc.
  updatePlayerListUI() {
    const playerListEl = document.getElementById("playerList");
    if (!playerListEl) return;

    const playerRows: string[] = [];
    for (let i = 0; i < this.params.nPlayers; i++) {
      const userId = this.playerUserIds.get(i);
      const score = this.gameState?.players[i]?.score ?? 0;

      // Convert Color3 to RGB for CSS
      const color = PLAYER_COLORS[i];
      const rgb = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;

      // Key bindings for each player
      let keyBinding = '';
      if (this.isLocal) {
        const localKeyBindings = [
          '(W/S)',   // Player 1
          '(J/U)',   // Player 2
          '(T/Y)',   // Player 3
          '(V/B)'    // Player 4
        ];
        keyBinding = localKeyBindings[i];
      } else {
        keyBinding = '(W/S)';
      }

      let playerInfo = '';
      if (userId !== undefined) {
        // Player connected
        if (userId === null) {
          playerInfo = `Player ${i + 1}: Guest`;
        } else {
          playerInfo = `Player ${i + 1}: User #${userId}`;
        }
      } else {
        // Waiting for player
        playerInfo = `Player ${i + 1}: Waiting...`;
      }
      playerInfo += ` ${keyBinding}`;

      playerRows.push(
        `<div style="display: flex; align-items: center; margin: 5px 0;">
          <div style="width: 20px; height: 20px; background: ${rgb}; margin-right: 10px; border: 1px solid #666;"></div>
          <span style="min-width: 200px;">${playerInfo}</span>
          <span style="font-weight: bold; margin-left: 20px;">Score: ${score}</span>
        </div>`
      );
    }

    playerListEl.innerHTML = playerRows.join('');
  }

  dispose() {
    this.engine.stopRenderLoop();

    // Close ws connections
    [this.sock, this.player2?.ws, this.player3?.ws, this.player4?.ws]
      .filter((ws): ws is WebSocket => ws !== undefined)
      .forEach(ws => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      });

    // ADDED: dispose bblon resources
    this.scene.dispose();
    this.engine.dispose();
  }
}

const PLAYER_COLORS = [
  new Color3(0.83, 0.42, 0.64),
  new Color3(0.64, 0.83, 0.42),
  new Color3(0.42, 0.64, 0.83),
  new Color3(0.83, 0.83, 0.21),
];

(window as any).PongApp = PongApp;
