"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbManager = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DbManager {
    DATABASE_PATH;
    static _instance;
    db;
    stmts;
    static getInstance(dbpath) {
        if (!DbManager._instance) {
            DbManager._instance = new DbManager(dbpath);
        }
        return DbManager._instance;
    }
    constructor(DATABASE_PATH = path_1.default.join(process.cwd(), "data/databases/authMangement.db")) {
        this.DATABASE_PATH = DATABASE_PATH;
        const dir = path_1.default.dirname(DATABASE_PATH);
        fs_1.default.mkdirSync(dir, { recursive: true });
        this.db = new better_sqlite3_1.default(DATABASE_PATH);
        this.createTables();
        this.stmts = this.prepareStatements();
    }
    createTables() {
        this.db.exec(`
    		CREATE TABLE IF NOT EXISTS users (
      			id INTEGER PRIMARY KEY,
      			username TEXT UNIQUE NOT NULL,
      			email TEXT UNIQUE NOT NULL,
      			password TEXT NOT NULL,
      			TwoFA INTEGER DEFAULT 0
    	) WITHOUT ROWID`);
        this.db.exec(`
			CREATE TABLE IF NOT EXISTS oauth_users (
				id INTEGER PRIMARY KEY,
				OauthProvider TEXT,
				externalId INTEGER UNIQUE NOT NULL,
				email TEXT,
				TwoFA INTEGER DEFAULT 0,
				UNIQUE (OauthProvider, externalId)
			)`);
    }
    prepareStatements() {
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
    getUserByCredential(credential1, credential2) {
        const cred2 = credential2 ?? credential1;
        return this.stmts.getUserByCredential.get({ cred1: credential1, cred2 });
    }
    saveCredentials(credentials) {
        this.stmts.saveCredentials.run(credentials);
    }
    saveOAuthCredentials(credentials) {
        this.stmts.saveOAuthCredentials.run(credentials);
    }
    getUserByOAuthId(externalId, OauthProvider) {
        return this.stmts.getUserByOAuthId.get({ externalId, OauthProvider });
    }
}
exports.DbManager = DbManager;
