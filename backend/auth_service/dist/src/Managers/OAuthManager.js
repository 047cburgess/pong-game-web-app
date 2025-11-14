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
exports.OAuthManager = void 0;
const crypto = __importStar(require("crypto"));
const url_1 = require("url");
const node_fetch_1 = __importDefault(require("node-fetch"));
const ApiError_1 = require("../Errors/ApiError");
const JWTManager_1 = require("./JWTManager");
const IdUtils_1 = require("../Utils/IdUtils");
const DbManager_1 = require("./DbManager");
class OAuthManager {
    static _instance;
    // --- Variables d'Environnement ---
    GITHUB_CLIENT_ID;
    GITHUB_CLIENT_SECRET;
    GITHUB_REDIRECT_URI;
    GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
    GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
    GITHUB_USER_URL = 'https://api.github.com/user';
    _stateStorage = new Map();
    constructor() {
        if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.GITHUB_REDIRECT_URI) {
            throw new Error("Missing critical GitHub OAuth environment variables (CLIENT_ID, CLIENT_SECRET, or REDIRECT_URI).");
        }
        this.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
        this.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
        this.GITHUB_REDIRECT_URI = "/user/oauth/github/callback";
    }
    static getInstance() {
        if (!OAuthManager._instance) {
            OAuthManager._instance = new OAuthManager();
        }
        return OAuthManager._instance;
    }
    generateState() {
        return crypto.randomBytes(16).toString('hex');
    }
    generateRedirectUrl(scope = 'user:email') {
        const stateToken = this.generateState();
        const params = new url_1.URLSearchParams({
            client_id: this.GITHUB_CLIENT_ID,
            redirect_uri: this.GITHUB_REDIRECT_URI,
            scope: scope,
            state: stateToken,
        });
        const redirectUrl = `${this.GITHUB_AUTHORIZE_URL}?${params.toString()}`;
        return {
            url: redirectUrl,
            state: stateToken
        };
    }
    async handleCallback(code, receivedState, expectedState) {
        if (receivedState !== expectedState || !expectedState) {
            throw ApiError_1.ApiError.Forbidden("CSRF_ATTACK_SUSPECTED", "received token different than expected token");
        }
        const params = new url_1.URLSearchParams({
            client_id: this.GITHUB_CLIENT_ID,
            client_secret: this.GITHUB_CLIENT_SECRET,
            code: code,
            redirect_uri: this.GITHUB_REDIRECT_URI,
        });
        const response = await (0, node_fetch_1.default)(this.GITHUB_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });
        const data = await response.json();
        if (data.error || !data.access_token) {
            throw ApiError_1.ApiError.BadRequest("OAUTH_TOKEN_EXCHANGE_FAILED", `GitHub: ${data.error_description || data.error || 'Inconnu'}`);
        }
        return { accessToken: data.access_token };
    }
    async completeGitHubLogin(accessToken) {
        const db = DbManager_1.DbManager.getInstance(undefined);
        const userProfile = await this.fetchGitHubUserProfile(accessToken);
        const timestamp = Date.now();
        if (!userProfile.id || !userProfile.email) {
            throw ApiError_1.ApiError.Internal("OAUTH_PROFILE_ERROR", "Failed to retrieve necessary user data (ID or email) from GitHub.");
        }
        let localUserId;
        const existingUser = db.getUserByOAuthId(userProfile.id.toString(), 'github');
        if (existingUser) {
            localUserId = existingUser.id;
        }
        else {
            const credentials = {
                id: IdUtils_1.IdUtils.generateId(timestamp),
                OauthProvider: "github",
                email: userProfile.email,
                externalId: userProfile.id.toString(),
                TwoFA: 0
            };
            localUserId = credentials.id;
            db.saveOAuthCredentials(credentials);
        }
        return JWTManager_1.JWTManager.getInstance().generateJWT(localUserId);
    }
    async fetchGitHubUserProfile(accessToken) {
        const response = await (0, node_fetch_1.default)(this.GITHUB_USER_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            throw ApiError_1.ApiError.Internal("GITHUB_API_ERROR", "Failed to retrieve user profile from GitHub API.");
        }
        const profileData = await response.json();
        return profileData;
    }
    retrieveAndClearState(sessionId) {
        const state = this._stateStorage.get(sessionId);
        this._stateStorage.delete(sessionId);
        return state;
    }
}
exports.OAuthManager = OAuthManager;
