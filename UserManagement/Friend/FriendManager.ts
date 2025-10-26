//import { DbManager } from "../Database/DbManager";
import { DbManager } from "../MOCKS/MOCK_DbManager";
import { PublicUserData, user_id } from "../UserData/User";
import { ManagerBase } from "../Commands/CommandManager";
import { ManagerRegistry } from "../ManagerRegistry";

type friend_id = user_id;



export enum FriendRequestStatus {
	REFUSED = 0,
	ACCEPTED = 1,
	PENDING = 2,
}

export interface FriendRequest {
	sender_id: user_id;
	receiver_id: user_id;
	status: FriendRequestStatus;
}

interface UserNode {
	friends: Set<friend_id>;
	incomingRequests: Set<user_id>;
	outgoingRequests: Set<friend_id>;
}

@ManagerRegistry.register(DbManager)
export class FriendManager extends ManagerBase {
	private graph: Map<user_id, UserNode> = new Map();

	// Updated request waiting to get saved in the db
	private requests: FriendRequest[] = [];
	//bidirectional "indexation" for O(1) access
	private senderIndex: Map<user_id, Map<friend_id, number>> = new Map();
	private receiverIndex: Map<user_id, Set<number>> = new Map();

	private toremove: { a: user_id, b: user_id }[] = [];

	constructor(private db: DbManager) {
		super();
	}

	// ----------------- Loading -----------------

	async loadUser(user_id: user_id) {
		if (this.graph.has(user_id)) return; //already loaded

		const node: UserNode = { friends: new Set(), incomingRequests: new Set(), outgoingRequests: new Set() };

		const sent = this.senderIndex.get(user_id);
		if (sent) for (const [, idx] of sent) this.applyRequest(user_id, node, this.requests[idx]!);

		const received = this.receiverIndex.get(user_id);
		if (received) for (const idx of received) this.applyRequest(user_id, node, this.requests[idx]!);

		const dbRequests = this.db.getFriendRequestsForUser(user_id);
		for (const req of dbRequests) {
			//if not already loaded from cache 
			if (this.senderIndex.get(req.sender_id)?.get(req.receiver_id) === undefined) {
				this.applyRequest(user_id, node, req);
			}
		}

		this.graph.set(user_id, node);
	}

	private applyRequest(user_id: user_id, node: UserNode, req: FriendRequest) {
		const isSender = user_id === req.sender_id;
		switch (req.status) {
			case FriendRequestStatus.PENDING:
				if (isSender) node.outgoingRequests.add(req.receiver_id);
				else node.incomingRequests.add(req.sender_id);
				break;
			case FriendRequestStatus.ACCEPTED:
				node.friends.add(isSender ? req.receiver_id : req.sender_id);
				break;
			case FriendRequestStatus.REFUSED:
				break;
		}
	}

	// ----------------- Friend Requests -----------------

	//Upsert an update into the requests buffer (modify existing update if present, else push new)
	upsertUpdate(update: FriendRequest) {
		const { sender_id: sender, receiver_id: receiver, status } = update;

		if (status === FriendRequestStatus.REFUSED)
			this.toremove.push({ a: sender, b: receiver });
		
		let idx = this.senderIndex.get(sender)?.get(receiver);
		if (idx !== undefined) {
			const req = this.requests[idx];
			if (req) {
				const oldStatus = req.status;
				req.status = status;
				this.updateNodes(sender, receiver, oldStatus, status);
			}
			return;
		}
		idx = this.requests.length;
		this.requests.push(update);
		if (!this.senderIndex.has(sender)) this.senderIndex.set(sender, new Map());
		this.senderIndex.get(sender)!.set(receiver, idx);
		if (!this.receiverIndex.has(receiver)) this.receiverIndex.set(receiver, new Set());
		this.receiverIndex.get(receiver)!.add(idx);

		this.updateNodes(sender, receiver, null, status);


	}

	private updateNodes(sender: user_id, receiver: user_id, oldStatus: FriendRequestStatus | null, newStatus: FriendRequestStatus) {
		const senderNode = this.graph.get(sender);
		const receiverNode = this.graph.get(receiver);


		if (oldStatus === FriendRequestStatus.PENDING) {
			senderNode?.outgoingRequests.delete(receiver);
			receiverNode?.incomingRequests.delete(sender);
		} else if (oldStatus === FriendRequestStatus.ACCEPTED) {
			senderNode?.friends.delete(receiver);
			receiverNode?.friends.delete(sender);
		}

		if (newStatus === FriendRequestStatus.PENDING) {
			senderNode?.outgoingRequests.add(receiver);
			receiverNode?.incomingRequests.add(sender);
		} else if (newStatus === FriendRequestStatus.ACCEPTED) {
			senderNode?.outgoingRequests.delete(receiver);
			receiverNode?.incomingRequests.delete(sender);
			senderNode?.friends.add(receiver);
			receiverNode?.friends.add(sender);
		} else if (newStatus === FriendRequestStatus.REFUSED) {
			senderNode?.outgoingRequests.delete(receiver);
			receiverNode?.incomingRequests.delete(sender);
		}
	}
	// ----------------- Accessors -----------------

	//could probably make it try to load the usernode if not found 
	getUserNode(user_id: user_id): UserNode | undefined {
		return this.graph.get(user_id);
	}

	getFriendList(user_id: user_id): friend_id[] {
		return Array.from(this.graph.get(user_id)?.friends ?? []);
	}

	getPendingRequests(user_id: user_id): user_id[] {
		return Array.from(this.graph.get(user_id)?.incomingRequests ?? []);
	}

	getOutgoingRequests(user_id: user_id): user_id[] {
		return Array.from(this.graph.get(user_id)?.outgoingRequests ?? []);
	}
	// ----------------- Save -----------------


	/*
		when saving we technically could check for refused request and not add them to the db
		but is it worth it, that means checking the status of each new request
	*/
	saveAll() {
		if (this.requests.length === 0) return;

		this.db.saveFriendRequests(this.requests);
		this.db.RemoveFriendRequests(this.toremove);

		this.requests = [];
		this.toremove = [];
		this.senderIndex.clear();
		this.receiverIndex.clear();
	}

	// ----------------- Unload - Remove -----------------

	removeUser(user_id: user_id) {
		this.unloadUser(user_id);
		this.db.RemoveAllUserFriendRequests(user_id);
	}

	unloadUser(user_id: user_id) {
		const node = this.graph.get(user_id);
		if (node)
			this.graph.delete(user_id);
	}

	// ----------------- Debug / Print -----------------

	printFullState() {
		const printCollection = <T>(label: string, collection: Iterable<T>, emptyMsg = "(empty)") => {
			const arr = Array.from(collection);
			console.log(`${label} (${arr.length}): ${arr.length > 0 ? arr.join(", ") : emptyMsg}`);
		};

		console.log("\n╔════════════════════════════════════════╗");
		console.log("║        FRIEND MANAGER STATE            ║");
		console.log("╚════════════════════════════════════════╝");
		
		console.log("\n📊 USER GRAPH");
		console.log("─".repeat(42));
		if (this.graph.size === 0) {
			console.log("  (empty)");
		} else {
			for (const [uid, node] of this.graph.entries()) {
				console.log(`\n👤 User ${uid}:`);
				printCollection("  👥 Friends", node.friends);
				printCollection("  📥 Incoming Requests", node.incomingRequests);
				printCollection("  📤 Outgoing Requests", node.outgoingRequests);
			}
		}
		console.log("\n\n📝 REQUESTS CACHE");
		console.log("─".repeat(42));
		if (this.requests.length === 0) {
			console.log("  (empty)");
		} else {
			this.requests.forEach((req, idx) => {
				const statusIcon = req.status === FriendRequestStatus.ACCEPTED ? "✅" :
					req.status === FriendRequestStatus.PENDING ? "⏳" : "❌";
				console.log(`  [${idx}] ${statusIcon} ${req.sender_id} → ${req.receiver_id} (${FriendRequestStatus[req.status]})`);
			});
		}
		console.log("\n\n🔗 SENDER INDEX");
		console.log("─".repeat(42));
		if (this.senderIndex.size === 0) {
			console.log("  (empty)");
		} else {
			for (const [sender, map] of this.senderIndex.entries()) {
				console.log(`  Sender ${sender}:`);
				for (const [receiver, idx] of map.entries()) {
					console.log(`    → ${receiver} = requests[${idx}]`);
				}
			}
		}
		console.log("\n🔗 RECEIVER INDEX");
		console.log("─".repeat(42));
		if (this.receiverIndex.size === 0) {
			console.log("  (empty)");
		} else {
			for (const [receiver, set] of this.receiverIndex.entries()) {
				printCollection(`  Receiver ${receiver}`, set);
			}
		}
		console.log("\n🗑️  TO REMOVE");
		console.log("─".repeat(42));
		if (this.toremove.length === 0) {
			console.log("  (empty)");
		} else {
			this.toremove.forEach((pair, idx) => {
				console.log(`  [${idx}] ${pair.a} ↔ ${pair.b}`);
			});
		}

		console.log("\n" + "═".repeat(42) + "\n");
	}

}
