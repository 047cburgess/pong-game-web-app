import Database from "better-sqlite3";
import { CommonCredentialsInfo, CredentialsInfo, OauthCredentialsInfo } from "../Interfaces/UserPrivateInfo";
import path from "path";
import fs from "fs";
import { get } from "http";

export class DbManager {
	private static _instance: DbManager;

	private db: Database.Database;
	private stmts: {
		getUserByCredential: Database.Statement;
		//saveCredentials: Database.Statement;
		getUserByOAuthId: Database.Statement;
		//saveOAuthCredentials: Database.Statement;
		deleteUserById: Database.Statement;
		getUserById: Database.Statement;
		insertRegularUser: Database.Statement;
		insertUserInfo: Database.Statement;
		insertOAuthUser: Database.Statement;
		updateRegularUser: Database.Statement;
		updatePassword: Database.Statement;
	};

	public static getInstance(dbpath: string | undefined): DbManager {
		if (!DbManager._instance) {
			DbManager._instance = new DbManager(dbpath);
		}
		return DbManager._instance;
	}

	constructor(private DATABASE_PATH = path.join(process.cwd(), "data/databases/authMangement.db")) {
		const dir = path.dirname(DATABASE_PATH);
		fs.mkdirSync(dir, { recursive: true });

		this.db = new Database(DATABASE_PATH);
		this.createTables();
		this.stmts = this.prepareStatements();
	}

	private createTables() {
		this.db.exec(`
    		CREATE TABLE IF NOT EXISTS regular_users (
      			id INTEGER PRIMARY KEY,
      			username TEXT UNIQUE NOT NULL,
      			email TEXT UNIQUE NOT NULL,
      			TwoFA INTEGER DEFAULT 0
    	) WITHOUT ROWID`
		);
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS user_info (
				id INTEGER PRIMARY KEY,
				password TEXT NOT NULL,
				FOREIGN KEY (id) REFERENCES regular_users(id) ON DELETE CASCADE
			)
		`);
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS oauth_users (
				id INTEGER PRIMARY KEY,
				OauthProvider TEXT,
				externalId INTEGER UNIQUE NOT NULL,
				UNIQUE (OauthProvider, externalId)
				FOREIGN KEY (id) REFERENCES regular_users(id) ON DELETE CASCADE
			)`
		);
	}

	private prepareStatements() {
		return {
			getUserByCredential: this.db.prepare(`
            	SELECT r.id, r.username, r.email, r.TwoFA, u.password
            	FROM regular_users r
            	INNER JOIN user_info u ON r.id = u.id
            	WHERE r.username = @cred1 OR r.email = @cred2
            	LIMIT 1
        	`),

			getUserById: this.db.prepare(`
            	SELECT *
            	FROM regular_users
            	WHERE id = @id
        		LIMIT 1
        	`),

			getUserByOAuthId: this.db.prepare(`
            	SELECT r.id, r.username, r.email, r.TwoFA, o.OauthProvider, o.externalId
            	FROM oauth_users o
            	INNER JOIN regular_users r ON o.id = r.id
            	WHERE o.externalId = @externalId AND o.OauthProvider = @OauthProvider
            	LIMIT 1
        	`),

			insertRegularUser: this.db.prepare(`
            	INSERT INTO regular_users (id, username, email, TwoFA)
            	VALUES (@id, @username, @email, @TwoFA)
        	`),

			insertUserInfo: this.db.prepare(`
            	INSERT INTO user_info (id, password)
            	VALUES (@id, @password)
        	`),

			insertOAuthUser: this.db.prepare(`
            	INSERT INTO oauth_users (id, OauthProvider, externalId)
            	VALUES (@id, @OauthProvider, @externalId)
        	`),


			updateRegularUser: this.db.prepare(`
            	UPDATE regular_users 
           		SET 
                	username = COALESCE(@username, username),
                	email = COALESCE(@email, email),
                	TwoFA = COALESCE(@TwoFA, TwoFA)
            	WHERE id = @id
        	`),

			updatePassword: this.db.prepare(`
            	UPDATE user_info 
            	SET password = @password
            	WHERE id = @id
        	`),
			deleteUserById: this.db.prepare(`
            	DELETE FROM regular_users WHERE id = @id
        	`)
		};
	}

	/*
	 
	 credential1 : main credential(username ou email)
	 credential2 : optional, if not given credential will be tested as both username and mail
	 could add specific methods to  get user specificaly from username or mail
	*/
	getUserByCredential(credential1: string, credential2?: string): CredentialsInfo | undefined {
		const cred2 = credential2 ?? credential1;
		return this.stmts.getUserByCredential.get({ cred1: credential1, cred2 }) as CredentialsInfo | undefined;
	}

	getUserById(userId: number): CommonCredentialsInfo | undefined {
		return this.stmts.getUserById.get({ id: userId }) as CommonCredentialsInfo | undefined;
	}

	public createUserWithOAuth(user: OauthCredentialsInfo) {
		const insertTx = this.db.transaction((user: OauthCredentialsInfo) => {
			this.stmts.insertRegularUser.run({
				id: user.id,
				username: user.username,
				email: user.email,
				TwoFA: user.TwoFA
			});

			this.stmts.insertOAuthUser.run({
				id: user.id,
				OauthProvider: user.OauthProvider,
				externalId: user.externalId
			});
		});

		return insertTx(user);
	}

	getUserByOAuthId(externalId: string, OauthProvider: string): OauthCredentialsInfo | undefined {
		return this.stmts.getUserByOAuthId.get({ externalId, OauthProvider }) as OauthCredentialsInfo | undefined;
	}

	deleteUserById(userId: number): void {
		this.stmts.deleteUserById.run({ id: userId });
	}

	public createUserWithPassword(user: CredentialsInfo) {
		const insertTx = this.db.transaction((user: CredentialsInfo) => {
			this.stmts.insertRegularUser.run({
				id: user.id,
				username: user.username,
				email: user.email,
				TwoFA: user.TwoFA
			});

			this.stmts.insertUserInfo.run({
				id: user.id,
				password: user.password
			});
		});

		return insertTx(user);
	}

	public updateUser(id: number, data: Partial<CredentialsInfo>) {
		const updateTx = this.db.transaction(() => {
			if (data.username || data.email || data.TwoFA !== undefined) {
				this.stmts.updateRegularUser.run({
					id: id,
					username: data.username || null,
					email: data.email || null,
					TwoFA: data.TwoFA
				});
			}

			if (data.password) {
				this.stmts.updatePassword.run({
					id: id,
					password: data.password
				});
			}
		});

		return updateTx();
	}
}
