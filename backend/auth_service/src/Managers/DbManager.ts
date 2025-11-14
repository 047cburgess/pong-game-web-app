import Database from "better-sqlite3";
import { CredentialsInfo, OauthCredentialsInfo } from "../Interfaces/UserPrivateInfo";
import path from "path";
import fs from "fs";

export class DbManager {
	private static _instance: DbManager;

	private db: Database.Database;
	private stmts: {
		getUserByCredential: Database.Statement;
		saveCredentials: Database.Statement;
		getUserByOAuthId: Database.Statement;
		saveOAuthCredentials: Database.Statement;
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
    		CREATE TABLE IF NOT EXISTS users (
      			id INTEGER PRIMARY KEY,
      			username TEXT UNIQUE NOT NULL,
      			email TEXT UNIQUE NOT NULL,
      			password TEXT NOT NULL,
      			TwoFA INTEGER DEFAULT 0
    	) WITHOUT ROWID`
		);
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS oauth_users (
				id INTEGER PRIMARY KEY,
				OauthProvider TEXT,
				externalId INTEGER UNIQUE NOT NULL,
				email TEXT,
				TwoFA INTEGER DEFAULT 0,
				UNIQUE (OauthProvider, externalId)
			)`
		);
	}

	private prepareStatements() {
		return {
			getUserByCredential: this.db.prepare(`
        		SELECT *
        		FROM users
        		WHERE username = @cred1 OR email = @cred2
        		LIMIT 1
			`),
			saveCredentials: this.db.prepare(`
                INSERT INTO users (id, username, email, password, TwoFA)
                VALUES (@id, @username, @email, @password, @TwoFA)
            `),
			getUserByOAuthId: this.db.prepare(`
				SELECT * FROM oauth_users WHERE externalId = @externalId AND OauthProvider = @OauthProvider
			`),
			saveOAuthCredentials: this.db.prepare(`
				INSERT INTO oauth_users (id, OauthProvider, externalId, email, TwoFA)
				VALUES (@id, @OauthProvider, @externalId, @email, @TwoFA)
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

	saveCredentials(credentials: CredentialsInfo): void {
		this.stmts.saveCredentials.run(credentials);
	}

	saveOAuthCredentials(credentials: OauthCredentialsInfo): void {
		this.stmts.saveOAuthCredentials.run(credentials);
	}

	getUserByOAuthId(externalId : string, OauthProvider: string) : OauthCredentialsInfo | undefined {
		return this.stmts.getUserByOAuthId.get({ externalId, OauthProvider }) as OauthCredentialsInfo | undefined;
	}
}
