import Database from "better-sqlite3";
import { ManagerBase } from "./CommandManager";
import { UserData, user_id } from "./UserManager";
import { FriendRequest } from "./FriendManager";
import { ManagerRegistry } from "./ManagerRegistry";
import fs from 'fs';
import path from "path";

@ManagerRegistry.register()
export class DbManager extends ManagerBase {
	private db: Database.Database;

	private stmts: {
		getUserById: Database.Statement;
		getUserByName: Database.Statement;
		hasUserByName: Database.Statement;
		saveUser: Database.Statement;
		removeUser: Database.Statement;
		getFriendRequests: Database.Statement;
		saveFriendRequest: Database.Statement;
		removeFriendRequestById: Database.Statement;
		removeAllUserFriendRequests: Database.Statement;
	};

	constructor(private DATABASE_PATH = path.join(process.cwd(), "databases/usermanagement.db")) {
		super();
		this.ensureDir();
		this.db = new Database(DATABASE_PATH);
		this.initialize();
		this.stmts = this.prepareStatements();
	}

	private initialize() {
		this.createTables();
	}

	private ensureDir() {
		const dir = path.dirname(this.DATABASE_PATH);
		fs.mkdirSync(dir, { recursive: true });
	}

	private createTables() {
		// Users table
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER NOT NULL PRIMARY KEY,
				name TEXT NOT NULL,
				last_seen INTEGER NOT NULL
			) WITHOUT ROWID
		`);

		// Friend requests table with request_id as PK
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS friend_requests (
				request_id TEXT PRIMARY KEY,
				sender_id INTEGER NOT NULL,
				receiver_id INTEGER NOT NULL,
				status INTEGER NOT NULL,
				FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
				FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
			)
		`);

		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
			CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
		`);
	}

	private prepareStatements() {
		return {
			getUserById: this.db.prepare(`
				SELECT id, name, last_seen FROM users WHERE id = ?
			`),
			getUserByName: this.db.prepare(`
				SELECT id, name, last_seen FROM users WHERE name = ?
			`),
			hasUserByName: this.db.prepare(`SELECT 1 FROM users WHERE name = ? LIMIT 1`),
			saveUser: this.db.prepare(`
				INSERT INTO users (id, name, last_seen)
				VALUES (?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					name = excluded.name,
					last_seen = excluded.last_seen
			`),
			removeUser: this.db.prepare(`DELETE FROM users WHERE id = ?`),
			getFriendRequests: this.db.prepare(`
				SELECT request_id, sender_id, receiver_id, status
				FROM friend_requests
				WHERE sender_id = ? OR receiver_id = ?
			`),
			saveFriendRequest: this.db.prepare(`
				INSERT INTO friend_requests (request_id, sender_id, receiver_id, status)
				VALUES (?, ?, ?, ?)
				ON CONFLICT(request_id) DO UPDATE SET
					status = excluded.status
			`),
			removeFriendRequestById: this.db.prepare(`
				DELETE FROM friend_requests WHERE request_id = ?
			`),
			removeAllUserFriendRequests: this.db.prepare(`
				DELETE FROM friend_requests WHERE sender_id = ? OR receiver_id = ?
			`),
		};
	}

	// ================= USER =================
	getUserById(id: user_id): UserData | undefined {
		return this.stmts.getUserById.get(id) as UserData | undefined;
	}

	getUserByName(username: string): UserData | undefined {
		return this.stmts.getUserByName.get(username) as UserData | undefined;
	}

	hasUserByName(username: string): boolean {
		return this.stmts.hasUserByName.get(username) !== undefined;
	}

	saveUser(user: UserData): void {
		this.stmts.saveUser.run(user.id, user.name, user.last_seen);
	}

	removeUser(id: user_id): void {
		this.stmts.removeUser.run(id);
	}

	// ================= FRIEND REQUESTS =================
	getFriendRequestsForUser(user_id: user_id): FriendRequest[] {
		return this.stmts.getFriendRequests.all(user_id, user_id) as FriendRequest[];
	}

	RemoveAllUserFriendRequests(user_id: user_id): void {
		this.stmts.removeAllUserFriendRequests.run(user_id, user_id);
	}

	saveFriendRequests(requests: FriendRequest[]): void {
		if (requests.length === 0) return;
		const insertMany = this.db.transaction((reqs: FriendRequest[]) => {
			for (const req of reqs) {
				this.stmts.saveFriendRequest.run(req.request_id, req.sender_id, req.receiver_id, req.status);
			}
		});
		insertMany(requests);
	}

	RemoveFriendRequestsById(request_ids: string[]): void {
		if (request_ids.length === 0) return;
		const deleteMany = this.db.transaction((ids: string[]) => {
			for (const id of ids) {
				this.stmts.removeFriendRequestById.run(id);
			}
		});
		deleteMany(request_ids);
	}

	// ================= CLEANUP =================
	close(): void {
		this.db.close();
	}

	saveAll() {
		
	}
	// ================= DEBUG =================
	printStats(): void {
		const userCount = this.db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
		const requestCount = this.db.prepare("SELECT COUNT(*) as count FROM friend_requests").get() as { count: number };
		console.log("=== Database Stats ===");
		console.log(`Users: ${userCount.count}`);
		console.log(`Friend Requests: ${requestCount.count}`);
	}
}
