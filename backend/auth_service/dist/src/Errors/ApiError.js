"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    status;
    details;
    constructor(status, message, details = []) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = Array.isArray(details) ? details : [details];
        Object.setPrototypeOf(this, ApiError.prototype);
    }
    toResponse() {
        return {
            status: this.status,
            message: this.message,
            details: this.details,
        };
    }
    static BadRequest(message, details) {
        return new ApiError(400, message, details);
    }
    static Unauthorized(message, details) {
        return new ApiError(401, message, details);
    }
    static Forbidden(message, details) {
        return new ApiError(403, message, details);
    }
    static Internal(message, details = ['Une erreur interne est survenue.']) {
        return new ApiError(500, message, details);
    }
}
exports.ApiError = ApiError;
