import fastifyHttpProxy from '@fastify/http-proxy'
import { FastifyInstance } from "fastify"
import { JwtCookieChecker } from './Hanlders';

export async function apiGateway(server: FastifyInstance) {

	server.addHook("onRequest", JwtCookieChecker);

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

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.USER_SERVICE}`,
		prefix: "/user",
		rewritePrefix: '/user',
	});
}
