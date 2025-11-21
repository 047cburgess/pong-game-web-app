import fastifyHttpProxy from '@fastify/http-proxy'
import { FastifyInstance } from "fastify"
import { JwtCookieChecker, OnSendHandler } from './Hanlders';
import { on } from 'events';

export async function apiGateway(server: FastifyInstance) {

	server.addHook("onRequest", JwtCookieChecker);

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/queue",
		rewritePrefix: "/queue",
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/events",
		rewritePrefix: "/events",
		http2: false,
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/user/stats",
		rewritePrefix: "/user/stats",
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/users/:username/stats",
		rewritePrefix: "/users/:username/stats",
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/user/games",
		rewritePrefix: "/user/games",
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/user/tournaments",
		rewritePrefix: "/user/tournaments",
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/games",
		rewritePrefix: "/games",
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/tournaments",
		rewritePrefix: "/tournaments",
	});

	server.addHook("onSend", OnSendHandler);

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.USER_SERVICE}`,
		prefix: "/user",
		rewritePrefix: '/user',
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.GAME_SERVICE_URL}`,
		prefix: "/ws",
		rewritePrefix: "/ws",
		websocket: true,
		wsUpstream: `${process.env.GAME_SERVICE_URL}`.replace('http://', 'ws://'),
		replyOptions: {
			rewriteRequestHeaders: (originalReq, headers) => {
				// Forward the x-user-id header for WebSocket connections
				return {
					...headers,
					'x-user-id': originalReq.headers['x-user-id'] || '',
				};
			}
		}
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.GAME_SERVICE_URL}`,
		prefix: "/games/local",
		rewritePrefix: "/games/local",
	});
}
