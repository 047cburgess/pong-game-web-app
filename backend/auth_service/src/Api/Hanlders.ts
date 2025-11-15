import { FastifyReply, FastifyRequest, HookHandlerDoneFunction, onRequestAsyncHookHandler } from "fastify";
import { JWTManager } from "../Managers/JWTManager";
import { TwoFactorRequiredError } from "../Errors/TwoFactorRequiredError";
import { ApiError } from "../Errors/ApiError";

export const JwtCookieChecker: onRequestAsyncHookHandler = async (request, reply) => {
	const publicPaths: string[] = [];

	if (publicPaths.some(path => request.url.startsWith(path))) {
		return;
	}
	const token = request.cookies?.jwt;
	if (token) {
		const payload = JWTManager.getInstance().verifyJWT(token);
		if (payload){
			request.headers['x-user-id'] = (payload.sub as string);
			console.log(request.headers['x-user-id'] as string);
			return;
		}
		else
			return reply.status(401).send("INVALID_JWT");
	}
	return reply.status(401).send("MISSING_JWT");
}

export const authErrorHandler = (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof TwoFactorRequiredError) {
        reply.setCookie("token2FA", error.token, {
            path: "/user/login", 
            httpOnly: true,
            sameSite: "strict",
            secure: "auto",
            maxAge: 60 * 5 
        });
        return reply.status(401).send({ status: "2FA_REQUIRED" });
    }

    if (error instanceof ApiError) {
        return reply.status(error.status).send({ 
            error: error.message,
            details: error.details
        });
    }

    request.log.error(error); 
    
    return reply.status(500).send({
        error: "Internal Server Error"
    });
};

export const TwoFaCookieChecker =  (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {

}