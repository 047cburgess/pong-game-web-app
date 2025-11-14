"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFAManager = void 0;
const timers_1 = require("timers");
const crypto = __importStar(require("crypto"));
const IdUtils_1 = require("../Utils/IdUtils");
const nodemailer_1 = __importDefault(require("nodemailer"));
class TwoFAManager {
    static _instance;
    activeCodes = new Map();
    activeTimeouts = new Set();
    transporter;
    CODE_VALIDITY_MS = 5 * 60 * 1000;
    constructor() {
        //ADD
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }
    static getInstance() {
        if (!TwoFAManager._instance) {
            TwoFAManager._instance = new TwoFAManager();
        }
        return TwoFAManager._instance;
    }
    generateCode() {
        const min = 0;
        const max = 999999;
        const code = crypto.randomInt(min, max + 1);
        return code.toString().padStart(6, '0');
    }
    setupExpiration(user_id, code) {
        const token = IdUtils_1.IdUtils.generateId(Date.now());
        const timeout = (0, timers_1.setTimeout)(() => {
            if (this.activeCodes.get(token)?.code === code) {
                this.activeCodes.delete(token);
                console.log(`2FA code for user ${user_id} expired and removed.`);
            }
            this.activeTimeouts.delete(timeout);
        }, this.CODE_VALIDITY_MS);
        this.activeTimeouts.add(timeout);
        this.activeCodes.set(token, { id: user_id, code, timeoutId: timeout });
        return token;
    }
    generateAndStoreCode(id) {
        const newCode = this.generateCode();
        const token = this.setupExpiration(id, newCode);
        return token;
    }
    getCode(token) {
        return this.activeCodes.get(token)?.code || null;
    }
    getUserId(token) {
        return this.activeCodes.get(token)?.id || null;
    }
    testCodeValidity(token, userCode) {
        const entry = this.activeCodes.get(token);
        if (!entry) {
            throw new Error("INVALID2FA_TOKEN");
        }
        if (entry.code !== userCode) {
            throw new Error("INVALID2FA_CODE");
        }
        const user_id = entry.id;
        (0, timers_1.clearTimeout)(entry.timeoutId);
        this.activeTimeouts.delete(entry.timeoutId);
        this.activeCodes.delete(token);
        return user_id;
    }
    regenerateCode(token) {
        const existingEntry = this.activeCodes.get(token);
        if (!existingEntry) {
            throw new Error("Cannot regenerate code: Token not found or expired.");
        }
        (0, timers_1.clearTimeout)(existingEntry.timeoutId);
        this.activeTimeouts.delete(existingEntry.timeoutId);
        this.activeCodes.delete(token);
        const newCode = this.generateCode();
        return this.setupExpiration(existingEntry.id, newCode);
    }
    prepareMailData(token, recipientEmail) {
        const code = this.getCode(token);
        if (!code) {
            return null;
        } //should never happen
        const subject = "Your Two-Factor Authentication Code";
        const htmlBody = `
            <html>
                <body>
                    <h1>Hello!</h1>
                    <p>Your one-time login code is:</p>
                    <h2 style="color: #4CAF50; background-color: #f0f0f0; padding: 10px; display: inline-block; border-radius: 5px;">${code}</h2>
                    <p>This code is valid for ${this.CODE_VALIDITY_MS / 60000} minutes.</p>
                    <p>If you did not request this code, please ignore this email.</p>
                    <p>Sincerely,</p>
                    <p>The Support Team</p>
                </body>
            </html>
        `;
        return {
            to: recipientEmail,
            subject: subject,
            htmlBody: htmlBody
        };
    }
    async sendMail(token, recipientEmail) {
        const mailData = this.prepareMailData(token, recipientEmail);
        if (!mailData) {
            throw new Error("Cannot send mail: Invalid token of code expired.");
        }
        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"No Reply" <noreply@ft_transcendence.com>',
                to: mailData.to,
                subject: mailData.subject,
                html: mailData.htmlBody,
            });
            console.log(`2FA mail sent successfully to ${recipientEmail}`);
        }
        catch (error) {
            console.error("Failed to send 2FA email:", error);
            throw new Error("Failed to send 2FA email. Please try again.");
        }
    }
    closeAllIntervals() {
        console.log(`Shutting down 2FAManager: Clearing ${this.activeTimeouts.size} active intervals.`);
        this.activeTimeouts.forEach(timeout => {
            (0, timers_1.clearTimeout)(timeout);
        });
        this.activeTimeouts.clear();
        this.activeCodes.clear();
    }
}
exports.TwoFAManager = TwoFAManager;
