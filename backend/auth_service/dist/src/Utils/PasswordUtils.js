"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordUtils = exports.PasswordErrors = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
var PasswordErrors;
(function (PasswordErrors) {
    PasswordErrors["TOO_SHORT"] = "TOO_SHORT";
    PasswordErrors["TOO_LONG"] = "TOO_LONG";
    PasswordErrors["MISSING_UPPERCASE"] = "MISSING_UPPERCASE";
    PasswordErrors["MISSING_LOWERCASE"] = "MISSING_LOWERCASE";
    PasswordErrors["MISSING_NUMBER"] = "MISSING_NUMBER";
    PasswordErrors["MISSING_SPECIAL"] = "MISSING_SPECIAL";
})(PasswordErrors || (exports.PasswordErrors = PasswordErrors = {}));
class PasswordUtils {
    static HAS_UPPERCASE = /[A-Z]/;
    static HAS_LOWERCASE = /[a-z]/;
    static HAS_NUMBER = /[0-9]/;
    static HAS_SPECIAL = /[!@#$%^&*(),.?":{}|<>]/;
    static PASSWORD_MIN_LEN = 12;
    static PASSWORD_MAX_LEN = 64;
    static SALT_ROUNDS = 12;
    static validatePassword(password) {
        const result = { success: false, errors: [] };
        if (!password || password.length < this.PASSWORD_MIN_LEN)
            result.errors.push(PasswordErrors.TOO_SHORT);
        if (password.length > this.PASSWORD_MAX_LEN)
            result.errors.push(PasswordErrors.TOO_LONG);
        if (!this.HAS_UPPERCASE.test(password))
            result.errors.push(PasswordErrors.MISSING_UPPERCASE);
        if (!this.HAS_LOWERCASE.test(password))
            result.errors.push(PasswordErrors.MISSING_LOWERCASE);
        if (!this.HAS_NUMBER.test(password))
            result.errors.push(PasswordErrors.MISSING_NUMBER);
        if (!this.HAS_SPECIAL.test(password))
            result.errors.push(PasswordErrors.MISSING_SPECIAL);
        if (result.errors.length === 0)
            result.success = true;
        return result;
    }
    static async hash(password) {
        return bcryptjs_1.default.hash(password, this.SALT_ROUNDS);
    }
    static async compare(password, hash) {
        return bcryptjs_1.default.compareSync(password, hash);
    }
}
exports.PasswordUtils = PasswordUtils;
