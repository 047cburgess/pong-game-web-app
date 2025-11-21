import { ManagerBase } from "./CommandManager";
import { DbManager } from "./DbManager";
import { ManagerRegistry } from "./ManagerRegistry";
import { generateUsername } from "../Utils/UsernameGenerator";

const OFFLINE_THRESHOLD = 1000 * 60 * 5; // 5 minutes sans activité

export type user_id = number

export enum UserStatus{
	OFFLINE = 0,
	ONLINE = 1
}

export interface PublicInfo {
	id: number,
	username: string,
	lastSeen: number,
	avatarUrl: string
}

export interface UserData {
	id : user_id,
	name:string,
	last_seen: number,
	avatarUrl: string
}


@ManagerRegistry.register(DbManager)
export class UserManager extends ManagerBase {
	private users: Map<user_id, UserData> = new Map();
	private nameToId: Map<string, user_id> = new Map();

	constructor(private db: DbManager) {
		super();
	}

	// ---------------- Cache Utils ----------------

	private addToCache(user: UserData) {
		this.users.set(user.id, user);
		this.nameToId.set(user.name, user.id);
	}

	private removeFromCache(user: UserData) {
		this.users.delete(user.id);
		this.nameToId.delete(user.name);
	}

	removeName(username: string) {
		this.nameToId.delete(username);
	}

	hasCached(id: user_id): boolean {
		return this.users.has(id);
	}

	getCachedCount(): number {
		return this.users.size;
	}

	clearCache(): void {
		this.users.clear();
		this.nameToId.clear();
	}

	// ---------------- Resolution / Lookup ----------------

	resolveUsername(username: string): user_id | undefined {
		const cached = this.nameToId.get(username);
		if (cached !== undefined) return cached;

		const user = this.db.getUserByName(username);
		if (user !== undefined) {
			this.addToCache(user);
			return user.id;
		}
		return undefined;
	}

	usernameExists(username: string): boolean {
		if (this.nameToId.has(username)) return true;
		return this.db.hasUserByName(username);
	}

	getOrLoadUserByID(id: user_id): UserData | undefined {
		let user = this.users.get(id);
		if (user === undefined) {
			user = this.db.getUserById(id);
			if (user !== undefined) this.addToCache(user);
		}
		return user;
	}

	getOrLoadUserByName(username: string): UserData | undefined {
		const id = this.nameToId.get(username);
		if (id !== undefined) return this.getOrLoadUserByID(id);

		const user = this.db.getUserByName(username);
		if (user) this.addToCache(user);
		return user;
	}

	// ---------------- Lifecycle ----------------

	createDefault(id: user_id, name?: string, avatarUrl? : string): UserData {
		const timestamp = Date.now();
		const user: UserData = {
			id: id,
			name: name ?? generateUsername(timestamp), //idk should we give a random username until chaged ?
			last_seen: timestamp,
			avatarUrl: avatarUrl ?? "/api/v1/user/avatars/default.webp"
		};
		this.addToCache(user);
		this.db.saveUser(user);
		return user;
	}

	//idk could be batch saved
	saveUser(id: user_id) {
		const user = this.users.get(id);
		if (user !== undefined) this.db.saveUser(user);
	}

	removeUser(id: user_id) {
		this.unloadUser(id);
		this.db.removeUser(id);
	}

	saveAll() {
		for (const user of this.users.values())
			this.db.saveUser(user);
	}

	unloadUser(id: user_id) {
		const user = this.users.get(id);
		if (user === undefined) return;
		this.db.saveUser(user);
		this.removeFromCache(user);
	}

	unloadInactiveUsers() : user_id[]{
		const inactive_users : user_id[] = [];
		const now = Date.now();
		for (const user of this.users.values()) {
			if (now - user.last_seen > OFFLINE_THRESHOLD) {
				inactive_users.push(user.id);
				this.unloadUser(user.id);
			}
		}
		return inactive_users;
	}

	// ---------------- Ping / Seen ----------------

	onUserSeen(id: user_id): UserData {
		let user = this.users.get(id);
		if (user === undefined) {
			user = this.getOrLoadUserByID(id) ?? this.createDefault(id);
		}
		user.last_seen = Date.now();
		return user;
	}

	// ---------------- Internal Tools ----------------

	getUserID(username: string): user_id | undefined {
		return this.nameToId.get(username);
	}

	getUserByID(id: user_id): UserData | undefined {
		return this.users.get(id);
	}

	getUserByName(username: string): UserData | undefined {
		const id = this.nameToId.get(username);
		return id ? this.users.get(id) : undefined;
	}

	// ---------------- Tools for PublicInfo -------------
	toPublic(user: UserData): PublicInfo {
		return {
			id : user.id,
			username: user.name,
			lastSeen: user.last_seen,
			avatarUrl: user.avatarUrl
		};
	}

	getPublicByID(id: user_id): PublicInfo | undefined {
		const user = this.getOrLoadUserByID(id);
		return user ? this.toPublic(user) : undefined;
	}

	getPublicByUsername(username: string): PublicInfo | undefined {
		const user = this.getOrLoadUserByName(username);
		return user ? this.toPublic(user) : undefined;
	}

	getPublicBatchByIDs(ids: user_id[]): PublicInfo[] {
		const result: PublicInfo[] = [];
		for (const id of ids) {
			const user = this.getOrLoadUserByID(id);
			if (user !== undefined) result.push(this.toPublic(user));
		}
		return result;
	}

	getPublicBatchByUsernames(usernames: string[]): PublicInfo[] {
		const result: PublicInfo[] = [];
		for (const name of usernames) {
			const user = this.getOrLoadUserByName(name);
			if (user !== undefined) result.push(this.toPublic(user));
		}
		return result;
	}

	printUserManager() {
		console.log("\n╔════════════════════════════════════════╗");
		console.log("║         USER MANAGER STATE             ║");
		console.log("╚════════════════════════════════════════╝");

		console.log(`\n📊 Number of users in cache: ${this.getCachedCount()}`);

		console.log("\n👤 Cached users:");

		if (this.users.size === 0) {
			console.log("  (empty)");
		} else {
			for (const [id, user] of this.users.entries()) {
				console.log(`  • ID: ${id}`);
				console.log(`    Name: ${user.name}`);
				console.log(`    Last activity: ${new Date(user.last_seen).toLocaleString()}`);
			}
		}
		console.log("\n🔗 Name -> ID Map:");
		if (this.nameToId.size === 0) {
			console.log("  (empty)");
		} else {
			for (const [name, id] of this.nameToId.entries()) {
				console.log(`  • "${name}" -> ${id}`);
			}
		}
		console.log("\n" + "═".repeat(42) + "\n");
	}
}

