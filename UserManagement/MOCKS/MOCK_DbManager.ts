import { ManagerBase } from "../Commands/CommandManager";
import { UserData, user_id } from "../UserData/User";
import { FriendRequest } from "../Friend/FriendManager";

/**
 * Mock complet du DbManager pour tester la logique métier
 * Pas de vrai SQLite, tout en mémoire
 */
export class DbManager extends ManagerBase {
	// In-memory storage
	private users: Map<user_id, UserData> = new Map();
	private usersByName: Map<string, UserData> = new Map();
	private friendRequests: Map<string, FriendRequest> = new Map(); // key: "sender_id:receiver_id"

	// Spy/Stats pour vérifier les appels
	public stats = {
		getUserByIdCalls: 0,
		getUserByNameCalls: 0,
		hasUserByNameCalls: 0,
		saveUserCalls: 0,
		removeUserCalls: 0,
		getFriendRequestsCalls: 0,
		saveFriendRequestsCalls: 0,
		removeFriendRequestsCalls: 0,
		removeAllUserFriendRequestsCalls: 0,
		saveUsersCalls: 0,
	};

	// Flags pour simuler des erreurs
	public shouldFailOnSave = false;
	public shouldFailOnLoad = false;

	constructor() {
		super();
	}

	// ============= RESET / DEBUG =============

	/**
	 * Reset complet du mock (pour tests isolés)
	 */
	reset(): void {
		this.users.clear();
		this.usersByName.clear();
		this.friendRequests.clear();
		this.resetStats();
	}

	resetStats(): void {
		Object.keys(this.stats).forEach(key => {
			(this.stats as any)[key] = 0;
		});
	}

	/**
	 * Seed des données de test
	 */
	seed(users: UserData[], requests: FriendRequest[] = []): void {
		for (const user of users) {
			this.users.set(user.user_id, { ...user });
			this.usersByName.set(user.name, { ...user });
		}
		for (const req of requests) {
			const key = this.makeKey(req.sender_id, req.receiver_id);
			this.friendRequests.set(key, { ...req });
		}
	}

	/**
	 * Récupère toutes les données (pour assertions)
	 */
	getAllUsers(): UserData[] {
		return Array.from(this.users.values());
	}

	getAllFriendRequests(): FriendRequest[] {
		return Array.from(this.friendRequests.values());
	}

	// ============= USER OPERATIONS =============

	getUserById(id: user_id): UserData | undefined {
		this.stats.getUserByIdCalls++;

		if (this.shouldFailOnLoad) {
			throw new Error(`[Mock] Simulated error on getUserById(${id})`);
		}

		const user = this.users.get(id);
		return user ? { ...user } : undefined; // Clone pour éviter mutations
	}

	getUserByName(username: string): UserData | undefined {
		this.stats.getUserByNameCalls++;

		if (this.shouldFailOnLoad) {
			throw new Error(`[Mock] Simulated error on getUserByName(${username})`);
		}

		const user = this.usersByName.get(username);
		return user ? { ...user } : undefined;
	}

	hasUserByName(username: string): boolean {
		this.stats.hasUserByNameCalls++;

		if (this.shouldFailOnLoad) {
			throw new Error(`[Mock] Simulated error on hasUserByName(${username})`);
		}

		return this.usersByName.has(username);
	}

	saveUser(user: UserData): void {
		this.stats.saveUserCalls++;

		if (this.shouldFailOnSave) {
			throw new Error(`[Mock] Simulated error on saveUser(${user.user_id})`);
		}

		// Vérification de contrainte UNIQUE sur name
		const existing = this.usersByName.get(user.name);
		if (existing && existing.user_id !== user.user_id) {
			throw new Error(`[Mock] UNIQUE constraint failed: users.name (${user.name})`);
		}

		// Supprimer l'ancien nom si changé
		const oldUser = this.users.get(user.user_id);
		if (oldUser && oldUser.name !== user.name) {
			this.usersByName.delete(oldUser.name);
		}

		const clone = { ...user };
		this.users.set(user.user_id, clone);
		this.usersByName.set(user.name, clone);
	}

	removeUser(id: user_id): void {
		this.stats.removeUserCalls++;

		if (this.shouldFailOnSave) {
			throw new Error(`[Mock] Simulated error on removeUser(${id})`);
		}

		const user = this.users.get(id);
		if (user) {
			this.users.delete(id);
			this.usersByName.delete(user.name);

			// CASCADE: supprimer les friend requests
			this.RemoveAllUserFriendRequests(id);
		}
	}

	// ============= FRIEND OPERATIONS =============

	getFriendRequestsForUser(user_id: user_id): FriendRequest[] {
		this.stats.getFriendRequestsCalls++;

		if (this.shouldFailOnLoad) {
			throw new Error(`[Mock] Simulated error on getFriendRequestsForUser(${user_id})`);
		}

		const results: FriendRequest[] = [];
		for (const req of this.friendRequests.values()) {
			if (req.sender_id === user_id || req.receiver_id === user_id) {
				results.push({ ...req });
			}
		}
		return results;
	}

	RemoveAllUserFriendRequests(user_id: user_id): void {
		this.stats.removeAllUserFriendRequestsCalls++;

		if (this.shouldFailOnSave) {
			throw new Error(`[Mock] Simulated error on RemoveAllUserFriendRequests(${user_id})`);
		}

		const toDelete: string[] = [];
		for (const [key, req] of this.friendRequests.entries()) {
			if (req.sender_id === user_id || req.receiver_id === user_id) {
				toDelete.push(key);
			}
		}
		for (const key of toDelete) {
			this.friendRequests.delete(key);
		}
	}

	// ============= BATCH OPERATIONS =============

	saveUsers(users: UserData[]): void {
		this.stats.saveUsersCalls++;

		if (this.shouldFailOnSave) {
			throw new Error(`[Mock] Simulated error on saveUsers(${users.length} users)`);
		}

		// Simule une transaction : tout ou rien
		try {
			for (const user of users) {
				this.saveUser(user);
			}
		} catch (error) {
			// Rollback simulation (on ne fait rien, les saves précédents restent)
			throw error;
		}
	}

	saveFriendRequests(requests: FriendRequest[]): void {
		this.stats.saveFriendRequestsCalls++;

		if (this.shouldFailOnSave) {
			throw new Error(`[Mock] Simulated error on saveFriendRequests(${requests.length} requests)`);
		}

		for (const req of requests) {
			const key = this.makeKey(req.sender_id, req.receiver_id);
			this.friendRequests.set(key, { ...req });
		}
	}

	RemoveFriendRequests(pairs: { a: user_id; b: user_id }[]): void {
		this.stats.removeFriendRequestsCalls++;

		if (this.shouldFailOnSave) {
			throw new Error(`[Mock] Simulated error on RemoveFriendRequests(${pairs.length} pairs)`);
		}

		for (const pair of pairs) {
			const key = this.makeKey(pair.a, pair.b);
			this.friendRequests.delete(key);
		}
	}

	// ============= HELPERS =============

	private makeKey(sender: user_id, receiver: user_id): string {
		return `${sender}:${receiver}`;
	}

	// ============= CLEANUP =============

	close(): void {
		// Mock ne fait rien
	}

	saveAll(): void {
		// Mock ne fait rien
	}

	// ============= DEBUG / UTILS =============

	printStats(): void {
		console.log("=== Mock Database Stats ===");
		console.log(`Users: ${this.users.size}`);
		console.log(`Friend Requests: ${this.friendRequests.size}`);
		console.log("\n=== Call Stats ===");
		console.log(JSON.stringify(this.stats, null, 2));
	}

	/**
	 * Pretty print pour debugging
	 */
	print(): void {
		console.log("\n=== MOCK DB STATE ===");
		console.log("Users:");
		for (const user of this.users.values()) {
			console.log(`  [${user.user_id}] ${user.name} (status: ${user.status}, last_seen: ${user.last_seen})`);
		}
		console.log("\nFriend Requests:");
		for (const req of this.friendRequests.values()) {
			console.log(`  ${req.sender_id} -> ${req.receiver_id} (status: ${req.status})`);
		}
		console.log("===================\n");
	}
}