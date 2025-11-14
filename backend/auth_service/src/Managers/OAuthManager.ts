import * as crypto from 'crypto';
import { URLSearchParams } from 'url';
import fetch from 'node-fetch';
import { ApiError } from '../Errors/ApiError';
import { JWTManager } from './JWTManager';
import { IdUtils } from '../Utils/IdUtils';
import { OauthCredentialsInfo } from '../Interfaces/UserPrivateInfo';
import { DbManager } from './DbManager';

// Définir la structure de la réponse d'échange de token (pour la clarté)
interface GitHubTokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
}

interface GitHubProfileResponse {
	id: number,
	email: string,
	login: string,
}


export class OAuthManager {
	private static _instance: OAuthManager;

	// --- Variables d'Environnement ---
	private readonly GITHUB_CLIENT_ID: string;
	private readonly GITHUB_CLIENT_SECRET: string;
	private readonly GITHUB_REDIRECT_URI: string;

	private readonly GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
	private readonly GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
	private readonly GITHUB_USER_URL = 'https://api.github.com/user';

	private _stateStorage: Map<string, string> = new Map();

	private constructor() {
		if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.GITHUB_REDIRECT_URI) {
			throw new Error("Missing critical GitHub OAuth environment variables (CLIENT_ID, CLIENT_SECRET, or REDIRECT_URI).");
		}
		this.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
		this.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
		this.GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI!;
	}

	public static getInstance(): OAuthManager {
		if (!OAuthManager._instance) {
			OAuthManager._instance = new OAuthManager();
		}
		return OAuthManager._instance;
	}

	private generateState(): string {
		return crypto.randomBytes(16).toString('hex');
	}

	public generateRedirectUrl(scope: string = 'user:email'): { url: string, state: string } {
		const stateToken = this.generateState();

		const params = new URLSearchParams({
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

	public async handleCallback(code: string, receivedState: string, expectedState: string): Promise<{ accessToken: string }> {
		console.log(`received state: ${receivedState}, expected state: ${expectedState}`);
		if (receivedState !== expectedState || !expectedState) {
			throw ApiError.Forbidden(
				"CSRF_ATTACK_SUSPECTED",
				"received token different than expected token"
			);
		}

		const params = new URLSearchParams({
			client_id: this.GITHUB_CLIENT_ID,
			client_secret: this.GITHUB_CLIENT_SECRET,
			code: code,
			redirect_uri: this.GITHUB_REDIRECT_URI,
		});

		const response = await fetch(this.GITHUB_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params.toString(),
		});

		const data = await response.json() as GitHubTokenResponse & { error?: string, error_description?: string };

		if (data.error || !data.access_token) {
			throw ApiError.BadRequest(
				"OAUTH_TOKEN_EXCHANGE_FAILED",
				`GitHub: ${data.error_description || data.error || 'Inconnu'}`
			);
		}
		
		return { accessToken: data.access_token };
	}

	public async completeGitHubLogin(accessToken: string): Promise<string> {
		const db = DbManager.getInstance(undefined);
		const userProfile = await this.fetchGitHubUserProfile(accessToken);
		const timestamp = Date.now();


		if (!userProfile.id || !userProfile.email) {
			throw ApiError.Internal(
				"OAUTH_PROFILE_ERROR",
				"Failed to retrieve necessary user data (ID or email) from GitHub."
			);
		}
		let localUserId: number;

		const existingUser = db.getUserByOAuthId(userProfile.id.toString(), 'github');
		if (existingUser) {
			localUserId = existingUser.id;
		} else {
			const credentials: OauthCredentialsInfo = {
				id: IdUtils.generateId(timestamp),
				OauthProvider: "github",
				email: userProfile.email,
				externalId: userProfile.id.toString(),
				TwoFA: 0
			};
			localUserId = credentials.id
			db.saveOAuthCredentials(credentials);
		}
		return JWTManager.getInstance().generateJWT(localUserId);
	}

	private async fetchGitHubUserProfile(accessToken: string): Promise<GitHubProfileResponse> {
		const response = await fetch(this.GITHUB_USER_URL, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Accept': 'application/vnd.github.v3+json',
			},
		});

		if (!response.ok) {
			throw ApiError.Internal("GITHUB_API_ERROR", "Failed to retrieve user profile from GitHub API.");
		}

		const profileData = await response.json();

		return profileData as GitHubProfileResponse;
	}

	public retrieveAndClearState(sessionId: string): string | undefined {
		const state = this._stateStorage.get(sessionId);
		this._stateStorage.delete(sessionId);
		return state;
	}

}
