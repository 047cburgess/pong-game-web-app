import type { WebSocket as WS } from "@fastify/websocket";
import { z } from 'zod';
export declare const gamePropertiesSchema: z.ZodObject<{
    nPlayers: z.ZodInt;
    coop: z.ZodDefault<z.ZodBoolean>;
    ballSpeed: z.ZodDefault<z.ZodNumber>;
    paddleSize: z.ZodDefault<z.ZodNumber>;
    paddleSpeed: z.ZodDefault<z.ZodNumber>;
    paddleInertia: z.ZodDefault<z.ZodNumber>;
    paddleFriction: z.ZodDefault<z.ZodNumber>;
    timeLimitMs: z.ZodDefault<z.ZodInt>;
    startingHealth: z.ZodOptional<z.ZodInt>;
    pointsTarget: z.ZodDefault<z.ZodOptional<z.ZodInt>>;
    fieldSize: z.ZodDefault<z.ZodLiteral<128000>>;
    tickMs: z.ZodDefault<z.ZodLiteral<20>>;
}, z.core.$strip>;
export type GameProperties = z.infer<typeof gamePropertiesSchema>;
export type GameId = string;
export type PlayerId = string;
export type UserId = number;
export type PlayerInput = {
    seq: number;
    time: number;
    up: boolean;
    down: boolean;
};
export type PlayerSocket = {
    id: PlayerId;
    userId?: number;
    ws: WS;
    lastSeq?: number;
    isViewer: boolean;
};
type PlayerState = {
    pos: number;
    vel: number;
    health: number;
    score: number;
    hitBy?: number;
};
type GameState = {
    pauseCd: number;
    tick: number;
    time: number;
    players: PlayerState[];
    ball: {
        pos: Vec2;
        vel: Vec2;
        lastRefl?: number;
    };
};
declare class Vec2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    add(v: Vec2): Vec2;
    sub(v: Vec2): Vec2;
    mul(s: number): Vec2;
    dot(v: Vec2): number;
    len(): number;
    rot(angle: 0 | 90 | 180 | 270): Vec2;
    normalize(): Vec2;
}
export declare class Game {
    readonly id: GameId;
    readonly tickMs: 20;
    readonly hook?: string;
    readonly params: GameProperties;
    readonly viewingKey: string;
    players: Map<string, PlayerSocket>;
    playerSides: Map<string, number>;
    readyPlayers: Set<string>;
    gameStart?: number;
    gameEnded: boolean;
    state: GameState;
    inputBuffers: Map<string, PlayerInput[]>;
    loop?: NodeJS.Timeout;
    lastTime: number;
    constructor(id: GameId, params: GameProperties, hook?: string);
    addPlayer(p: PlayerSocket): void;
    playerReady(pid: PlayerId): void;
    startGame(): void;
    removePlayer(pid: PlayerId): void;
    playerInput(playerId: PlayerId, input: PlayerInput): void;
    gameTick(): void;
    broadcast(msg: string): void;
    broadcastPlayerList(): void;
    sendTo(p: PlayerSocket, msg: string): void;
    updateBall(): void;
    collision(side: 0 | 1 | 2 | 3): void;
    playerCollision(rpos: Vec2, rvel: Vec2, side: 0 | 1 | 2 | 3): Vec2;
    applyInput(pid: PlayerId, input?: PlayerInput[]): void;
    checkGameEnd(): void;
    endGame(): Promise<void>;
}
export {};
//# sourceMappingURL=game.d.ts.map