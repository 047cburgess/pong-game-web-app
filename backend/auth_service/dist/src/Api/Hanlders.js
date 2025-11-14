"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFaCookieChecker = exports.authErrorHandler = exports.JwtCookieChecker = void 0;
const JWTManager_1 = require("../Managers/JWTManager");
const TwoFactorRequiredError_1 = require("../Errors/TwoFactorRequiredError");
const ApiError_1 = require("../Errors/ApiError");
const JwtCookieChecker = async (request, reply) => {
    const publicPaths = [];
    if (publicPaths.some(path => request.url.startsWith(path))) {
        return;
    }
    const token = request.cookies?.jwt;
    if (token) {
        const payload = JWTManager_1.JWTManager.getInstance().verifyJWT(token);
        if (payload) {
            request.headers['x-user-id'] = payload.sub;
            return;
        }
        else
            return reply.status(401).send("INVALID_JWT");
    }
    return reply.status(401).send("MISSING_JWT");
};
exports.JwtCookieChecker = JwtCookieChecker;
const authErrorHandler = (error, request, reply) => {
    if (error instanceof TwoFactorRequiredError_1.TwoFactorRequiredError) {
        reply.setCookie("token2FA", error.token, {
            path: "/user/login",
            httpOnly: true,
            sameSite: "strict",
            secure: "auto",
            maxAge: 60 * 5
        });
        return reply.status(401).send({ status: "2FA_REQUIRED" });
    }
    if (error instanceof ApiError_1.ApiError) {
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
exports.authErrorHandler = authErrorHandler;
const TwoFaCookieChecker = (request, reply, done) => {
};
exports.TwoFaCookieChecker = TwoFaCookieChecker;
