"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login2FABodySchema = exports.loginBodySchema = exports.registerBodySchema = void 0;
exports.AuthPlugin = AuthPlugin;
const AuthManager_1 = require("../Managers/AuthManager");
const Hanlders_1 = require("./Hanlders");
const cookie_1 = __importDefault(require("@fastify/cookie"));
const OAuthManager_1 = require("../Managers/OAuthManager");
exports.registerBodySchema = {
    type: "object",
    required: ["username", "email", "password"],
    properties: {
        username: { type: "string" },
        email: { type: "string" },
        password: { type: "string" },
        TwoFA: { type: "number" }
    },
};
exports.loginBodySchema = {
    type: "object",
    required: ["username", "password"],
    properties: {
        username: { type: "string" },
        password: { type: "string" },
    },
};
exports.login2FABodySchema = {
    type: "object",
    required: ["code"],
    properties: {
        code: { type: "string" }
    },
};
async function AuthPlugin(server) {
    await server.register(cookie_1.default); // ADD
    server.setErrorHandler(Hanlders_1.authErrorHandler);
    server.post("/user/register", { schema: { body: exports.registerBodySchema } }, async (request, reply) => {
        const token = await AuthManager_1.AuthManager.getInstance().register(request.body);
        reply.setCookie("jwt", token, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: "auto",
            maxAge: 60 * 60 * 24 * 7,
        });
        return reply.status(204).send();
    });
    server.post("/user/login", { schema: { body: exports.loginBodySchema } }, async (request, reply) => {
        const { username, password } = request.body;
        const jwt = await AuthManager_1.AuthManager.getInstance().login(username, password);
        reply.setCookie("jwt", jwt, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: "auto",
            maxAge: 60 * 60 * 24 * 7
        });
        return reply.status(204).send();
    });
    server.post("/user/login/two-factor", { schema: { body: exports.login2FABodySchema } }, async (request, reply) => {
        const { code } = request.body;
        const token2FA = request.cookies?.token2FA;
        if (!token2FA)
            return reply.status(401).send("MISSINGTwoFA_TOKEN");
        const JWTtoken = AuthManager_1.AuthManager.getInstance().login2FA(parseInt(token2FA), code);
        reply.clearCookie("token2FA");
        reply.setCookie("jwt", JWTtoken, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: "auto",
            maxAge: 60 * 60 * 24 * 7
        });
        return reply.status(204).send();
    });
    server.post("/user/logout", async (request, reply) => {
        reply.clearCookie("jwt", { path: "/" });
        return reply.status(204).send();
    });
    server.post("/user/oauth/github", async (request, reply) => {
        const { url, state } = OAuthManager_1.OAuthManager.getInstance().generateRedirectUrl();
        reply.setCookie("tokenOAuth", state, {
            path: "/user/oauth/github/callback",
            httpOnly: true,
            sameSite: "lax",
            secure: "auto",
            maxAge: 60 * 5
        });
        return reply.status(200).send({ redirectUrl: url });
    });
    server.get("/user/oauth/github/callback", async (request, reply) => {
        const query = request.query;
        const receivedCode = query.code;
        const receivedState = query.state;
        const expectedState = request.cookies?.tokenOAuth;
        if (!receivedCode) {
            return reply.status(400).send({ error: "No Github code received." });
        }
        if (!expectedState) {
            return reply.status(401).send({ error: "Invalid oauth token" });
        }
        const { accessToken } = await OAuthManager_1.OAuthManager.getInstance().handleCallback(receivedCode, receivedState || '', expectedState);
        reply.clearCookie("tokenOAuth");
        const token = await OAuthManager_1.OAuthManager.getInstance().completeGitHubLogin(accessToken);
        reply.setCookie("jwt", token, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: "auto",
            maxAge: 60 * 60 * 24 * 7
        });
        return reply.status(204).send();
    });
}
/*
server.post("/user/oauth/:provider", async (request, reply) => {


});*/
