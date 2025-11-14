"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiGateway = apiGateway;
const http_proxy_1 = __importDefault(require("@fastify/http-proxy"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const Hanlders_1 = require("./Hanlders");
async function apiGateway(server) {
    server.register(cookie_1.default); //to put in server when i'll do the server.ts 
    server.addHook("onRequest", Hanlders_1.JwtCookieChecker);
    server.register(http_proxy_1.default, {
        upstream: `${process.env.MATCHMAKING_SERVICE}`,
        prefix: "/user/stats"
    });
    server.register(http_proxy_1.default, {
        upstream: `${process.env.MATCHMAKING_SERVICE}`,
        prefix: "/user/games"
    });
    server.register(http_proxy_1.default, {
        upstream: `${process.env.MATCHMAKING_SERVICE}`,
        prefix: "/user/tournaments"
    });
    server.register(http_proxy_1.default, {
        upstream: `${process.env.MATCHMAKING_SERVICE}`,
        prefix: "/games"
    });
    server.register(http_proxy_1.default, {
        upstream: `${process.env.MATCHMAKING_SERVICE}`,
        prefix: "/tournaments"
    });
    server.register(http_proxy_1.default, {
        upstream: `${process.env.USER_SERVICE}`,
        prefix: "/user"
    });
}
