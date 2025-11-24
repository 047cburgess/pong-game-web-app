import { MailUtil } from "../Utils/MailUtils";
import { PasswordUtils } from "../Utils/PasswordUtils";
import { IdUtils } from "../Utils/IdUtils";
import { UsernameUtils } from "../Utils/UsernameUtils";
import { CommonCredentialsInfo, CredentialsInfo, UserCredentialsInfo } from "../Interfaces/UserPrivateInfo";
import { DbManager } from "./DbManager";
import { TwoFAManager } from "./TwoFAManager";
import { JWTManager } from "./JWTManager";
import { ApiError } from "../Errors/ApiError";
import { TwoFactorRequiredError } from "../Errors/TwoFactorRequiredError";
import { error } from "console";



export class AuthManager {
	private static _instance: AuthManager;

	constructor(
		private db: DbManager = DbManager.getInstance(undefined),
		private twoFA: TwoFAManager = TwoFAManager.getInstance(),
		private jwt_manager: JWTManager = JWTManager.getInstance()
	) { }

	public static getInstance(): AuthManager {
		if (!AuthManager._instance) {
			AuthManager._instance = new AuthManager();
		}
		return AuthManager._instance;
	}

	updateUsername(userId: number, newUsername: string): void {
		const credentials = this.db.getUserById(userId);
		if (!credentials)
			throw ApiError.NotFound("USER_NOT_FOUND", []);
		const errors = UsernameUtils.validateUsername(newUsername).errors;
		if (errors.length)
			throw ApiError.BadRequest("INVALID_USERNAME", errors);
		console.log(`userid : ${userId}`);
		console.log(`username : ${newUsername}`);
		credentials.username = newUsername;
		this.tryUpdateCredentials(userId, credentials);
	}
	//credential is either mail or username
	async login(credential: string, password: string): Promise<string> {

		const user = this.db.getUserByCredential(credential);

		if (!user || !await PasswordUtils.compare(password, user.password)) {
			throw ApiError.Unauthorized("AUTHENTIFICATION_FAILED", "Nom d'utilisateur ou mot de passe incorrect.");
		}


		if (user.TwoFA) {
			const token = this.twoFA.generateAndStoreCode(user.id);
			//this.twoFA.prepareMailData(token, user.email);

			//send mail: ADDED -> uses prepare mail data inside
			await this.twoFA.sendMail(token, user.email);

			throw new TwoFactorRequiredError(token.toString());
		}
		const jwt = this.jwt_manager.generateJWT(user.id);
		return jwt;
	}

	async notifyUserDataService(userId: number, username: string, avatarUrl?: string) {
		const endpoint = `${process.env.USER_SERVICE}/internal/user/initialize`;

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ user_id: userId, username: username, avatarUrl: avatarUrl })
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw ApiError.Unauthorized("ERROR_DURING_DATA_INIT", errorText);
		}
	}

	login2FA(token: number, code: string): string {
		const user_id = this.twoFA.testCodeValidity(token, code);
		return this.jwt_manager.generateJWT(user_id);
	}


	public getTwoFA(userId: number): number {
		const credentials = this.db.getUserById(userId);
		if (!credentials)
			throw ApiError.NotFound("USER_NOT_FOUND", []);
		return credentials.TwoFA;
	}

	public enableTwoFA(userId: number): void {
		const credentials = this.db.getUserById(userId);
		if (!credentials)
			throw ApiError.NotFound("USER_NOT_FOUND", []);
		if (!credentials.TwoFA) {
			credentials.TwoFA = 1;
			this.db.updateUser(userId, credentials);
		}
	}

	public async disableTwoFA(userId: number): Promise<void> {
		const credentials = this.db.getUserById(userId);
		if (!credentials)
			throw ApiError.NotFound("USER_NOT_FOUND", []);
		if (credentials.TwoFA) {
			credentials.TwoFA = 0;
			this.db.updateUser(userId, credentials);
		}
	}


	public validateCredentialsInfo(credentialsInfo: Omit<CredentialsInfo, 'id' | 'TwoFA'>): void {
		let { username, email, password } = credentialsInfo;
		const validationErrors: string[] = [
			...UsernameUtils.validateUsername(username).errors,
			...MailUtil.validateEmailAddress(email).errors,
			...PasswordUtils.validatePassword(password).errors
		];

		if (validationErrors.length > 0) {
			throw ApiError.BadRequest(
				"INVALID_INFORMATIONS",
				validationErrors
			);
		}
	}

	async register(credentialsInfo: Omit<CredentialsInfo, 'id' | 'TwoFA'>): Promise<string> {
		this.validateCredentialsInfo(credentialsInfo);

		const timestamp = Date.now();
		const credentials: CredentialsInfo = {
			id: IdUtils.generateId(timestamp),
			username: credentialsInfo.username,
			email: credentialsInfo.email,
			password: await PasswordUtils.hash(credentialsInfo.password),
			TwoFA: 0
		};
		this.trySaveCredentials(credentials);

		await this.notifyUserDataService(credentials.id, credentials.username);
		return this.jwt_manager.generateJWT(credentials.id);
	}

	public trySaveCredentials(credentialsInfo: CredentialsInfo): void {
		try {
			this.db.createUserWithPassword(credentialsInfo);
		}
		catch (e: any) {
			if (e.code === 'SQLITE_CONSTRAINT' || e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
				const conflictDetails: string[] = [];

				if (e.message.includes('username')) {
					conflictDetails.push("USERNAME_ALREADY_IN_USE");
				}
				if (e.message.includes('email')) {
					conflictDetails.push("EMAIL_ALREADY_IN_USE");
				}

				if (conflictDetails.length > 0) {
					throw ApiError.BadRequest("ALREADY_EXIST", conflictDetails);
				}
			}
			throw e;
		}
	}

	public tryUpdateCredentials(userId: number, credentials: CommonCredentialsInfo): void {
		try {
			this.db.updateUser(userId, credentials);
		}
		catch (e: any) {
			if (e.code === 'SQLITE_CONSTRAINT' || e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
				const conflictDetails: string[] = [];

				if (e.message.includes('username')) {
					conflictDetails.push("USERNAME_ALREADY_IN_USE");
				}
				if (e.message.includes('email')) {
					conflictDetails.push("EMAIL_ALREADY_IN_USE");
				}

				if (conflictDetails.length > 0) {
					throw ApiError.BadRequest("ALREADY_EXIST", conflictDetails);
				}
			}
			throw e;
		}
	}


	public deleteUserData(userId: number): void {
		this.db.deleteUserById(userId);
	}
}
