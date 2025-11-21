import { FastifyInstance } from "fastify";
import { AuthManager } from "../Managers/AuthManager";
import { authErrorHandler, JwtCookieChecker } from "./Hanlders";
import fastifyCookie from "@fastify/cookie";
import { OAuthManager } from "../Managers/OAuthManager";

export interface LoginBody {
	username: string, //can be either mail or username
	password: string

}

export interface OauthResponse {
	url: string,
	state: string
}


export interface LoginResponse {
	status: string,
	token: number,
}

export interface Login2FABody {
	code: string,
}

export const registerBodySchema = {
	type: "object",
	required: ["username", "email", "password"],
	properties: {
		username: { type: "string" },
		email: { type: "string" },
		password: { type: "string" },
		TwoFA: { type: "number" }
	},
}

export const loginBodySchema = {
	type: "object",
	required: ["username", "password"],
	properties: {
		username: { type: "string" },
		password: { type: "string" },
	},
};

export const login2FABodySchema = {
	type: "object",
	required: ["code"],
	properties: {
		code: { type: "string" }
	},
};


export interface RegisterBody {
	username: string,
	email: string,
	password: string,
	// TwoFA?: number   // amend for sqlite as doesnt take bools
}

export async function AuthPlugin(server: FastifyInstance) {
	server.setErrorHandler(authErrorHandler);

	server.post("/user/register", async (request, reply) => {
    const token = await AuthManager.getInstance().register((request.body as RegisterBody));
		reply.setCookie("jwt", token, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: "auto",
			maxAge: 60 * 60 * 24 * 7,
		});
		return reply.status(204).send();
	});

	server.post<{ Body: LoginBody }>("/user/login", { schema: { body: loginBodySchema } }, async (request, reply) => {
		const { username, password } = request.body;
		const jwt = await AuthManager.getInstance().login(username, password);
		reply.setCookie("jwt", jwt, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: "auto",
			maxAge: 60 * 60 * 24 * 7
		});

		return reply.status(200).send({ status: "success" });
	});

	server.post<{ Body: Login2FABody }>("/user/login/two-factor", { schema: { body: login2FABodySchema } }, async (request, reply) => {
		const { code } = request.body;
		const token2FA = request.cookies?.token2FA;
		if (!token2FA)
			return reply.status(401).send("MISSINGTWOFA_TOKEN");

		const JWTtoken = AuthManager.getInstance().login2FA(parseInt(token2FA), code);

		reply.clearCookie("token2FA", {
            path: "/user/login", 
            httpOnly: true,
            sameSite: "strict",
            secure: "auto",
        });

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
		const { url, state } = OAuthManager.getInstance().generateRedirectUrl();

		reply.setCookie("tokenOAuth", state, {
			// path: "/user/oauth/github/callback",
			httpOnly: true,
			sameSite: "lax",
			secure: false, //"auto" temp to false as browser doesnt like it
			maxAge: 60 * 5
		});
		return reply.status(200).send({ redirectUrl: url });
	});

	server.get("/user/oauth/github/callback", async (request, reply) => {
		const query = request.query as { code?: string; state?: string };
		const receivedCode = query.code;
		const receivedState = query.state;

		const expectedState = request.cookies?.tokenOAuth;

		if (!receivedCode) { return reply.status(400).send({ error: "No Github code received." }); }
		if (!expectedState) { return reply.status(401).send({ error: "Invalid oauth token" }); }

		const { accessToken } = await OAuthManager.getInstance().handleCallback(
			receivedCode,
			receivedState || '',
			expectedState
		);

		const token: string = await OAuthManager.getInstance().completeGitHubLogin(accessToken);
		reply.clearCookie("tokenOAuth", {
			path: "/user/oauth/github/callback",
			httpOnly: true,
			sameSite: "lax",
			secure: false,
		});
		reply.setCookie("jwt", token, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: false, //"auto" temp to false as browser doesn't like it
			maxAge: 60 * 60 * 24 * 7
		});
		return reply.status(200).send({ status: "success" });
	});

	server.put("/user/two-factor", {preHandler : JwtCookieChecker} ,async (request, reply) => {
		const user_id = request.headers['x-user-id'] as string;
		AuthManager.getInstance().enableTwoFA(Number(user_id));
		return reply.status(204).send();
	});

	server.delete("/user/two-factor", {preHandler : JwtCookieChecker}, async (request, reply) => {
		const user_id = request.headers['x-user-id'] as string;
		AuthManager.getInstance().disableTwoFA(Number(user_id));
		return reply.status(204).send();
	});
}
/*
server.post("/user/oauth/:provider", async (request, reply) => {


});*/
