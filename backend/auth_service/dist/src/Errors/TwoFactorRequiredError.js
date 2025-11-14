"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorRequiredError = void 0;
class TwoFactorRequiredError extends Error {
    token;
    status = 401;
    tosend = { status: "2FA_REQUIRED" };
    constructor(token) {
        super("Two-Factor Authentication is required to proceed.");
        this.name = 'TwoFactorRequiredError';
        this.token = token;
        Object.setPrototypeOf(this, TwoFactorRequiredError.prototype);
    }
}
exports.TwoFactorRequiredError = TwoFactorRequiredError;
