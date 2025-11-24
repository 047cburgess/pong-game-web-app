import { FastifyReply, FastifyRequest, HookHandlerDoneFunction, onRequestAsyncHookHandler } from "fastify";
import { JWTManager } from "../Managers/JWTManager";
import { TwoFactorRequiredError } from "../Errors/TwoFactorRequiredError";
import { ApiError } from "../Errors/ApiError";
import { AuthManager } from "../Managers/AuthManager";

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
            httpOnly: true,
            sameSite: "strict",
            secure: "auto",
            maxAge: 60 * 5 
        });
        return reply.status(200).send({ status: "2FA_REQUIRED" });
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



export const preHandlerHandler = (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
	if(request.method === `PUT` && request.url === `/user/username`)
	{
		const username = (request.body as {username : string}).username;
		console.log(`username : ${username}`);
		AuthManager.getInstance().updateUsername(Number(request.headers['x-user-id']), username); 
	}
	done();
};


export const OnSendHandler = (request: FastifyRequest, reply: FastifyReply, payload: any, done: HookHandlerDoneFunction) => 
{
	if(request.method === `DELETE` && reply.statusCode === 204 && request.url === `/user`)
	{
		reply.clearCookie("jwt", { path: "/" });
		AuthManager.getInstance().deleteUserData(Number(request.headers['x-user-id']));
	}
	done();
};

export const OnUserDeleted = (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => 
{


	
};


export const TwoFaCookieChecker =  (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {

}
