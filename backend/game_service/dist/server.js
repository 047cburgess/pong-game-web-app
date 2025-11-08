import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { z } from 'zod';
import { Game, gamePropertiesSchema, } from './game.js';
const games = new Map();
const tokenMap = new Map();
function createToken(playerId, gameId, ttlMs = 5 * 60_000) {
    const t = randomUUID();
    tokenMap.set(t, {
        playerId,
        gameId,
        expires: Date.now() + ttlMs
    });
    return t;
}
function validateToken(t) {
    const s = tokenMap.get(t);
    if (!s) {
        return null;
    }
    if (s.expires < Date.now()) {
        tokenMap.delete(t);
        return null;
    }
    return s;
}
// function revokeToken(t: string) { tokenMap.delete(t); }
const fastify = Fastify();
fastify.register(websocketPlugin);
fastify.post('/new-game', async (req, resp) => {
    let gameParams;
    try {
        gameParams = gamePropertiesSchema.parse(req.body);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return resp.status(400).send({
                errors: error.issues.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                })),
            });
        }
        return resp.status(500).send({ error: 'Server error' });
    }
    const gameId = randomUUID();
    const game = new Game(gameId, gameParams, req.body?.hook);
    games.set(gameId, game);
    let tokens = [];
    for (let i = 0; i < gameParams.nPlayers; i++) {
        tokens.push(createToken(randomUUID(), gameId));
    }
    return { gameId, tokens, gameParams };
});
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true, }, (ws, req) => {
        const token = req.query.token;
        const meta = validateToken(token);
        let game = meta ? games.get(meta.gameId) : null;
        if (!meta || !game) {
            try {
                ws.close(4001, 'unauthorized');
            }
            catch { }
            return;
        }
        const { playerId } = meta;
        const pSock = { id: playerId, ws };
        game.addPlayer(pSock);
        // revokeToken(token); // don't revoke so players can reconnect
        ws.on('message', (raw) => {
            let msg;
            try {
                msg = JSON.parse(String(raw));
            }
            catch {
                return;
            }
            if (!msg || typeof msg.seq !== 'number') {
                return;
            }
            if (pSock.lastSeq && msg.seq <= (pSock.lastSeq))
                return;
            pSock.lastSeq = msg.seq;
            msg.t ||= Date.now();
            game.playerInput(playerId, msg);
        });
        ws.on('close', () => {
            game.removePlayer(playerId);
        });
    });
});
const PORT = Number(process.env['LISTEN_PORT']) || 3000;
fastify.listen({ host: "0.0.0.0", port: PORT })
    .then(() => console.log(`Listening on 0.0.0.0:${PORT}`));
//# sourceMappingURL=server.js.map