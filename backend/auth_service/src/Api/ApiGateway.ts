import fastifyHttpProxy from '@fastify/http-proxy'
import { FastifyInstance } from "fastify"
import fastifyCookie from "@fastify/cookie";
import { JwtCookieChecker } from './Hanlders';

export async function apiGateway(server: FastifyInstance) {

	server.register(fastifyCookie);//to put in server when i'll do the server.ts 

	server.addHook("onRequest", JwtCookieChecker);

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/user/stats"
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/user/games"
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/user/tournaments"
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/games"
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.MATCHMAKING_SERVICE}`,
		prefix: "/tournaments"
	});

	server.register(fastifyHttpProxy, {
		upstream: `${process.env.USER_SERVICE}`,
		prefix: "/user"
	});
}
