"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsernameUtils = exports.UsernameErrors = void 0;
var UsernameErrors;
(function (UsernameErrors) {
    UsernameErrors["TOO_SHORT"] = "TOO_SHORT";
    UsernameErrors["TOO_LONG"] = "TOO_LONG";
    UsernameErrors["INVALID_CHARACTERS"] = "INVALID_CHARACTERS";
    UsernameErrors["MUST_CONTAIN_LETTERS"] = "MUST_CONTAIN_LETTERS";
    UsernameErrors["ALREADY_TAKEN"] = "ALREADY_TAKEN";
    UsernameErrors["DOES_NOT_EXIST"] = "DOES_NOT_EXIST";
})(UsernameErrors || (exports.UsernameErrors = UsernameErrors = {}));
class UsernameUtils {
    static VALID_USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
    static USERNAME_MIN_LEN = 3;
    static USERNAME_MAX_LEN = 32;
    static validateUsername(username) {
        const result = { success: false, errors: [] };
        if (username === "default" || username === "user")
            result.errors.push(UsernameErrors.ALREADY_TAKEN);
        if (!username || username.length < this.USERNAME_MIN_LEN)
            result.errors.push(UsernameErrors.TOO_SHORT);
        if (username.length > this.USERNAME_MAX_LEN)
            result.errors.push(UsernameErrors.TOO_LONG);
        if (!this.VALID_USERNAME_REGEX.test(username))
            result.errors.push(UsernameErrors.INVALID_CHARACTERS);
        if (!/[a-zA-Z]/.test(username))
            result.errors.push(UsernameErrors.MUST_CONTAIN_LETTERS);
        if (result.errors.length === 0)
            result.success = true;
        return result;
    }
}
exports.UsernameUtils = UsernameUtils;
