"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTManager = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JWTManager {
    static _instance;
    static SESSION_MAX_DURATION = 60 * 60 * 24 * 7 * 1000;
    secret;
    constructor() {
        if (!process.env.SECRET) {
            throw new Error("JWT Secret not set in environment variables");
        }
        this.secret = process.env.SECRET;
    }
    static getInstance() {
        if (!JWTManager._instance) {
            JWTManager._instance = new JWTManager();
        }
        return JWTManager._instance;
    }
    generateJWT(user_id) {
        const timestamp = Date.now();
        const payload = {
            sub: user_id,
            iat: Math.floor(timestamp / 1000),
            exp: Math.floor((timestamp + JWTManager.SESSION_MAX_DURATION) / 1000),
        };
        const token = jsonwebtoken_1.default.sign(payload, this.secret, { algorithm: "HS256" });
        return token;
    }
    verifyJWT(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.secret, { algorithms: ["HS256"] });
            return decoded;
        }
        catch (err) {
            return null;
        }
    }
}
exports.JWTManager = JWTManager;
