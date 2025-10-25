import Database from "better-sqlite3";
import { ManagerBase } from "../Commands/CommandManager";
import { UserData, user_id } from "../UserData/User";
import { FriendRequest } from "../Friend/FriendManager";

export class DbManager extends ManagerBase {
	private db: Database.Database;

	// Prepared statements (cached for performance)
	private stmts: {
		getUserById: Database.Statement;
		getUserByName: Database.Statement;
		hasUserByName: Database.Statement;
		saveUser: Database.Statement;
		removeUser: Database.Statement;
		getFriendRequests: Database.Statement;
		saveFriendRequest: Database.Statement;
		removeFriendRequest: Database.Statement;
		removeAllUserFriendRequests: Database.Statement;
	};

	constructor(dbPath = "./usermanagement.db") {
		super();
		this.db = new Database(dbPath);
		this.initialize();
		this.stmts = this.prepareStatements();
	}

	// ============= INITIALIZATION =============

	private initialize() {
		this.createTables();
	}

	private createTables() {
		// Users table
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS users (
				user_id INTEGER PRIMARY KEY,
				name TEXT NOT NULL UNIQUE,
				last_seen INTEGER NOT NULL,
				status INTEGER NOT NULL
			)
		`);

		// Friend requests table
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS friend_requests (
				sender_id INTEGER NOT NULL,
				receiver_id INTEGER NOT NULL,
				status INTEGER NOT NULL,
				PRIMARY KEY (sender_id, receiver_id),
				FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
				FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
			)
		`);

		// Indexes for performance
		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
			CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
			CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
		`);
	}

	private prepareStatements() {
		return {
			getUserById: this.db.prepare(`
				SELECT user_id, name, last_seen, status 
				FROM users 
				WHERE user_id = ?
			`),
			getUserByName: this.db.prepare(`
				SELECT user_id, name, last_seen, status 
				FROM users 
				WHERE name = ?
			`),
			hasUserByName: this.db.prepare(`
				SELECT 1 FROM users WHERE name = ? LIMIT 1
			`),
			saveUser: this.db.prepare(`
				INSERT INTO users (user_id, name, last_seen, status)
				VALUES (?, ?, ?, ?)
				ON CONFLICT(user_id) DO UPDATE SET
					name = excluded.name,
					last_seen = excluded.last_seen,
					status = excluded.status
			`),
			removeUser: this.db.prepare(`
				DELETE FROM users WHERE user_id = ?
			`),
			getFriendRequests: this.db.prepare(`
				SELECT sender_id, receiver_id, status
				FROM friend_requests
				WHERE sender_id = ? OR receiver_id = ?
			`),
			saveFriendRequest: this.db.prepare(`
				INSERT INTO friend_requests (sender_id, receiver_id, status)
				VALUES (?, ?, ?)
				ON CONFLICT(sender_id, receiver_id) DO UPDATE SET
					status = excluded.status
			`),
			removeFriendRequest: this.db.prepare(`
				DELETE FROM friend_requests 
				WHERE sender_id = ? AND receiver_id = ?
			`),
			removeAllUserFriendRequests: this.db.prepare(`
				DELETE FROM friend_requests 
				WHERE sender_id = ? OR receiver_id = ?
			`),
		};
	}

	// ============= USER OPERATIONS =============

	getUserById(id: user_id): UserData | undefined {
		try {
			return this.stmts.getUserById.get(id) as UserData | undefined;
		} catch (error) {
			console.error(`[DbManager] Error getting user by id ${id}:`, error);
			return undefined;
		}
	}

	getUserByName(username: string): UserData | undefined {
		try {
			return this.stmts.getUserByName.get(username) as UserData | undefined;
		} catch (error) {
			console.error(`[DbManager] Error getting user by name ${username}:`, error);
			return undefined;
		}
	}

	hasUserByName(username: string): boolean {
		try {
			return this.stmts.hasUserByName.get(username) !== undefined;
		} catch (error) {
			console.error(`[DbManager] Error checking user name ${username}:`, error);
			return false;
		}
	}

	saveUser(user: UserData): void {
		try {
			this.stmts.saveUser.run(user.user_id, user.name, user.last_seen, user.status);
		} catch (error) {
			console.error(`[DbManager] Error saving user ${user.user_id}:`, error);
			throw error;
		}
	}

	removeUser(id: user_id): void {
		try {
			this.stmts.removeUser.run(id);
		} catch (error) {
			console.error(`[DbManager] Error removing user ${id}:`, error);
			throw error;
		}
	}

	// ============= FRIEND OPERATIONS =============

	getFriendRequestsForUser(user_id: user_id): FriendRequest[] {
		try {
			return this.stmts.getFriendRequests.all(user_id, user_id) as FriendRequest[];
		} catch (error) {
			console.error(`[DbManager] Error getting friend requests for user ${user_id}:`, error);
			return [];
		}
	}

	RemoveAllUserFriendRequests(user_id: user_id): void {
		try {
			this.stmts.removeAllUserFriendRequests.run(user_id, user_id);
		} catch (error) {
			console.error(`[DbManager] Error removing all friend requests for user ${user_id}:`, error);
			throw error;
		}
	}

	// ============= BATCH OPERATIONS =============

	saveUsers(users: UserData[]): void {
		if (users.length === 0) return;

		try {
			const saveMany = this.db.transaction((usrs: UserData[]) => {
				for (const user of usrs) {
					this.stmts.saveUser.run(user.user_id, user.name, user.last_seen, user.status);
				}
			});

			saveMany(users);
		} catch (error) {
			console.error(`[DbManager] Error saving ${users.length} users:`, error);
			throw error;
		}
	}

	saveFriendRequests(requests: FriendRequest[]): void {
		if (requests.length === 0) return;

		try {
			const insertMany = this.db.transaction((reqs: FriendRequest[]) => {
				for (const req of reqs) {
					this.stmts.saveFriendRequest.run(req.sender_id, req.receiver_id, req.status);
				}
			});

			insertMany(requests);
		} catch (error) {
			console.error(`[DbManager] Error saving ${requests.length} friend requests:`, error);
			throw error;
		}
	}

	RemoveFriendRequests(pairs: { a: user_id; b: user_id }[]): void {
		if (pairs.length === 0) return;

		try {
			const deleteMany = this.db.transaction((prs: { a: user_id; b: user_id }[]) => {
				for (const pair of prs) {
					this.stmts.removeFriendRequest.run(pair.a, pair.b);
				}
			});

			deleteMany(pairs);
		} catch (error) {
			console.error(`[DbManager] Error removing ${pairs.length} friend requests:`, error);
			throw error;
		}
	}
	// ============= CLEANUP =============

	close(): void {
		this.db.close();
	}

	// ============= DEBUG / UTILS =============

	printStats(): void {
		const userCount = this.db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
		const requestCount = this.db.prepare("SELECT COUNT(*) as count FROM friend_requests").get() as { count: number };

		console.log("=== Database Stats ===");
		console.log(`Users: ${userCount.count}`);
		console.log(`Friend Requests: ${requestCount.count}`);
	}

	saveAll() {
		//idk could add backup to a file who knows
	}
}