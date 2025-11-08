import assert from 'assert';
import type { WebSocket as WS } from "@fastify/websocket";
import { z } from 'zod';

const FIELD_HALFSIZE = 64_000;
const FIELD_SIZE = 128_000; // FIELD_HALFSIZE * 2;
assert(FIELD_HALFSIZE * 2 === FIELD_SIZE);
const TICK_MS = 20;

export const gamePropertiesSchema = z.object({
  nPlayers: z.int().gte(2).lte(4),
  coop: z.boolean().default(false),
  ballSpeed: z.number().gte(16).lte(160).default(130),
  paddleSize: z.number().gte(4000).lte(60000).default(17000),
  paddleSpeed: z.number().gte(40).lte(500).default(320),
  paddleInertia: z.number().gte(0).lte(64).default(16),
  paddleFriction: z.number().gte(-5).lte(5).default(1.4),
  timeLimitMs: z.int()
    .multipleOf(1000)
    .gte(15_000).lte(30 * 60_000)
    .default(2 * 60_000),
  startingHealth: z.int().positive().optional(),
  pointsTarget: z.int().positive().optional().default(7),
  fieldSize: z.literal(FIELD_SIZE).default(FIELD_SIZE),
  tickMs: z.literal(TICK_MS).default(TICK_MS),
});

export type GameProperties = z.infer<typeof gamePropertiesSchema>;

export type GameId = string;
export type PlayerId = string;
export type PlayerInput = {
  seq: number,
  time: number,
  up: boolean,
  down: boolean,
};
export type PlayerSocket = {
  id: PlayerId,
  ws: WS,
  lastSeq?: number,
};
type PlayerState = {
  pos: number,
  vel: number,
  health: number,
  score: number,
  hitBy?: number,
};
type GameState = {
  pauseCd: number,
  tick: number,
  time: number,
  players: PlayerState[],
  ball: {
    pos: Vec2,
    vel: Vec2,
    lastRefl?: number,
  },
};

class Vec2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(v: Vec2) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vec2) { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s: number) { return new Vec2(this.x * s, this.y * s); }
  dot(v: Vec2) { return this.x * v.x + this.y * v.y; }
  len() { return Math.hypot(this.x, this.y); }
  rot(angle: 0 | 90 | 180 | 270): Vec2 {
    angle = 90 * ((Math.floor(angle / 90) % 4 + 4) % 4);
    switch (angle) {
      case 0: return this.mul(1);
      case 90: return new Vec2(this.y, -this.x);
      case 180: return this.mul(-1);
      case 270: return this.rot(90).rot(180);
    };
    assert(false, "unreachable");
  }
  normalize() {
    const L = this.len();
    return L === 0 ? new Vec2(0, 0) : this.mul(1 / L);
  }
}

const clamp = function(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
};

export class Game {
  readonly id: GameId;
  readonly tickMs;
  readonly hook?: string;
  readonly params: GameProperties;
  players = new Map<PlayerId, PlayerSocket>();
  playerSides = new Map<PlayerId, number>();
  gameStart?: number;
  state: GameState = {
    pauseCd: 0,
    tick: 0,
    time: 0,
    players: [],
    ball: {
      pos: new Vec2,
      vel: new Vec2,
    },
  };
  inputBuffers = new Map<PlayerId, PlayerInput[]>();
  loop?: NodeJS.Timeout;
  lastTime: number = Date.now();

  constructor(
    id: GameId,
    params: GameProperties,
    hook?: string,
  ) {
    this.id = id;
    this.params = params;
    this.hook = hook;
    this.tickMs = this.params.tickMs;
    this.state.pauseCd = Math.round(1000 / this.tickMs) * 3; // 3 sec worth of ticks
    for (let i = 0; i < this.params.nPlayers; i++) {
      this.state.players.push({
        pos: 0,
        vel: 0,
        health: this.params.startingHealth || Infinity,
        score: 0,
      });
    }
  }

  addPlayer(p: PlayerSocket) {
    console.log(`Game ${this.id}, player ${p.id} connected`);
    this.players.set(p.id, p);
    if (!this.playerSides.has(p.id)) {
      this.playerSides.set(p.id, this.playerSides.size);
    }
    this.sendTo(p, JSON.stringify({
      type: "game_join",
      params: this.params,
      pid: this.playerSides.get(p.id) as number,
    }));
    if (this.playerSides.size == this.params.nPlayers) {
      if (!this.loop) {
        this.broadcast(JSON.stringify({
          type: "game_start",
        }));
        console.log(`Game ${this.id} started`);
        this.gameStart = Date.now();
        this.loop = setInterval(this.gameTick.bind(this), this.tickMs);
      } else {
        this.sendTo(p, JSON.stringify({
          type: "game_start",
        }));
      }
    } else if (!this.loop) {
      this.broadcast(JSON.stringify({
        type: "game_wait",
        joinedPlayers: this.playerSides.size,
      }));
    }
  }

  removePlayer(pid: PlayerId) {
    this.players.delete(pid);
  }

  playerInput(playerId: PlayerId, input: PlayerInput) {
    const buf = this.inputBuffers.get(playerId);
    if (!buf) {
      this.inputBuffers.set(playerId, [input]);
      return;
    }
    buf.push(input);
  }

  gameTick() {
    const lt = Date.now();
    this.state.time += lt - this.lastTime;
    this.lastTime = lt;
    if (this.state.pauseCd) {
      this.state.pauseCd--;
      if (this.state.pauseCd === 0) {
        this.state.ball.vel = new Vec2(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize();
      }
    } else {
      this.state.tick++;
      Array.from(this.players.keys()).forEach((pid) => {
        this.applyInput(pid, this.inputBuffers.get(pid));
        this.inputBuffers.set(pid, []);
      });
      this.updateBall();
    }

    const update = { type: 'state', state: this.state, pid: -1 };
    Array.from(this.players.values()).forEach((p) => {
      assert(typeof this.playerSides.get(p.id) === 'number')
      update.pid = this.playerSides.get(p.id) as number;
      this.sendTo(p, JSON.stringify(update));
    });

    this.checkGameEnd();
  }

  broadcast(msg: string) {
    Array.from(this.players.values()).forEach((p) => { this.sendTo(p, msg); });
  }

  sendTo(p: PlayerSocket, msg: string) {
    if (p.ws.readyState !== p.ws.OPEN) {
      this.removePlayer(p.id);
      return;
    }
    try {
      assert(typeof this.playerSides.get(p.id) === 'number')
      p.ws.send(msg, (err?: Error) => {
        if (err) { p.ws.terminate(); this.removePlayer(p.id); }
      });
    } catch {
      p.ws.terminate(); this.removePlayer(p.id);
    }
  }

  updateBall() {
    let ball = this.state.ball;
    ball.pos = ball.pos.add(
      ball.vel.mul(this.tickMs * this.params.ballSpeed));
    if (Math.abs(ball.pos.x) > Math.abs(ball.pos.y)) {
      this.collision(0);
      this.collision(2);
      this.collision(1);
      this.collision(3);
    } else {
      this.collision(1);
      this.collision(3);
      this.collision(0);
      this.collision(2);
    }
  }

  collision(side: 0 | 1 | 2 | 3) {
    const angle = side * 90;
    const ball = this.state.ball;
    const rpos = ball.pos.rot(angle as any);
    let rvel = ball.vel.rot(angle as any);
    let pside = side;
    if (side === 1) {
      pside = 2;
    } else if (side === 2) {
      pside = 1;
    }
    if (this.state.players[pside]?.health) {
      rvel = this.playerCollision(rpos, rvel, pside as any);
    }
    if (rpos.x >= FIELD_HALFSIZE) {
      rpos.x = 2 * FIELD_HALFSIZE - rpos.x;
      rvel.x *= -1;
    }
    ball.pos = rpos.rot((360 - angle) as any);
    ball.vel = rvel.rot((360 - angle) as any);
  }

  playerCollision(rpos: Vec2, rvel: Vec2, side: 0 | 1 | 2 | 3): Vec2 {
    const pst = this.state.players[side] as PlayerState;
    pst.hitBy = undefined;
    if (rpos.x < FIELD_HALFSIZE) {
      return rvel;
    }
    rpos.y += (FIELD_HALFSIZE - rpos.x) / rvel.x * rvel.y;
    const hdist = (rpos.y - pst.pos) / this.params.paddleSize * 2;
    if (Math.abs(hdist) > 1) {
      if (typeof this.state.ball.lastRefl === 'number') {
        const lastHit
          = this.state.players[this.state.ball.lastRefl] as PlayerState;
        if (this.state.ball.lastRefl !== side) {
          lastHit.score++;
        } else {
          lastHit.score--;
        }
        pst.hitBy = this.state.ball.lastRefl;
      }
      pst.health--;
      return rvel;
    }
    this.state.ball.lastRefl = side;
    const newx = rvel.x;
    let newy = rvel.y + pst.vel * this.params.paddleFriction;
    if (Math.abs(newy) > Math.abs(newx) * 2.5) {
      newy = Math.sign(newy) * 2.5 * Math.abs(newx);
    }
    return new Vec2(newx, newy).normalize();
  }

  applyInput(pid: PlayerId, input?: PlayerInput[]) {
    const id = this.playerSides.get(pid);
    assert(id !== undefined);
    const state = this.state.players[id];
    assert(state);
    let newVel = 0;
    if (input?.length) {
      const inp = input.pop() as PlayerInput;
      newVel += inp.up ? 1 : 0;
      newVel -= inp.down ? 1 : 0;
    }
    newVel += state.vel * this.params.paddleInertia;
    newVel /= this.params.paddleInertia + 1;
    newVel = clamp(newVel, -1, 1);
    state.pos += (newVel + state.vel)
      * this.tickMs * this.params.paddleSpeed / 2;
    const pSize = this.params.paddleSize / 2;
    const npos = clamp(state.pos, -FIELD_HALFSIZE + pSize, FIELD_HALFSIZE - pSize);
    state.vel = newVel;
    if (npos !== state.pos) {
      state.vel = 0;
    }
    state.pos = npos;
  }

  checkGameEnd() {
    let out = 0;
    let bestScore = 0;
    for (const p of this.state.players) {
      if (p.health <= 0) {
        out += 1;
      }
      bestScore = Math.max(bestScore, p.score);
    }
    const scoreTarget = this.params.pointsTarget ?? Infinity;
    assert(this.gameStart);
    const timeRem = this.params.timeLimitMs - this.state.time;
    if (out + 1 >= this.params.nPlayers
      || bestScore >= scoreTarget
      || timeRem <= 0
    ) {
      this.endGame();
    }
  }

  endGame() {
    console.log(`Game ${this.id} ended`);
    this.loop?.close();
    // TODO(vaiva): end game
    // TODO(vaiva): send game results to the hook
    // TODO(vaiva): send game results to the players
  }
}
