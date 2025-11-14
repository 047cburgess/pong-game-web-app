"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailUtil = void 0;
class MailUtil {
    static EMAIL_MAXLENGTH = 320;
    static EMAIL_MINLENGTH = 6;
    static EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    static validateEmailAddress(email) {
        email = email.trim();
        if (email.length > this.EMAIL_MAXLENGTH ||
            email.length < this.EMAIL_MINLENGTH ||
            !this.EMAIL_REGEX.test(email))
            return { success: false, errors: ["INVALID_MAIL"] };
        return { success: true, errors: [] };
    }
}
exports.MailUtil = MailUtil;
