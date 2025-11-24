import { DbManager } from "./DbManager";
import { user_id } from "./UserManager";
import { ManagerBase } from "./CommandManager";
import { ManagerRegistry } from "./ManagerRegistry";

type friend_id = user_id;

export enum FriendRequestStatus {
	REFUSED = 0,
	ACCEPTED = 1,
	PENDING = 2,
}

export interface FriendRequest {
	request_id: string;
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
	private requests: Map<string, FriendRequest> = new Map();
	//user_id to request_id (Min_id:Max_id)
	private idToRequests: Map<user_id, Set<string>> = new Map();

	constructor(private db: DbManager) {
		super();
	}

	// ----------------- Loading -----------------

	loadUser(user_id: user_id) {
		this.graph.delete(user_id);

		const node: UserNode = { friends: new Set(), incomingRequests: new Set(), outgoingRequests: new Set() };

		const requests = this.idToRequests.get(user_id);
		if (requests) {
			for (const req_id of requests) {
				const req = this.requests.get(req_id);
				if (req) this.applyRequest(user_id, node, req);
			}
		}

		const dbRequests = this.db.getFriendRequestsForUser(user_id);
		for (const req of dbRequests) {
			if (!this.idToRequests.get(user_id)?.has(req.request_id)) {
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
				node.friends.delete(isSender ? req.receiver_id : req.sender_id);
				break;
		}
	}

	// ----------------- Friend Requests -----------------

	//Upsert an update into the requests buffer (modify existing update if present, else push new)
	upsertUpdate(update: Omit<FriendRequest, 'request_id'>) {
		const { sender_id: sender, receiver_id: receiver, status } = update;
		const request_id = sender < receiver ? `${sender}:${receiver}` : `${receiver}:${sender}`;

		if (this.requests.has(request_id)) {
			const req = this.requests.get(request_id)!;
			const oldStatus = req.status;
			this.updateNodes(req.sender_id, req.receiver_id, oldStatus, status);
			req.status = status;
			req.sender_id = sender;
			req.receiver_id = receiver;
			return;
		}

		const fullRequest: FriendRequest = { ...update, request_id };
		this.requests.set(request_id, fullRequest);
		if (!this.idToRequests.has(sender)) this.idToRequests.set(sender, new Set());
		this.idToRequests.get(sender)!.add(request_id);
		if (!this.idToRequests.has(receiver)) this.idToRequests.set(receiver, new Set());
		this.idToRequests.get(receiver)!.add(request_id);

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
		//this.printFullState();
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
		if (this.requests.size === 0) return;

		this.db.saveFriendRequests(Array.from(this.requests.values()));

		this.requests.clear();
		this.idToRequests.clear();
	}

	// ----------------- Unload - Remove -----------------

	removeUser(user_id: user_id) {
		this.unloadUser(user_id);
		const requests = this.idToRequests.get(user_id);
		if (requests)
			for (const req_id of requests)
				this.requests.delete(req_id);
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

		// ---------- USER GRAPH ----------
		console.log("\n📊 USER GRAPH");
		console.log("─".repeat(42));
		if (this.graph.size === 0) console.log("  (empty)");
		else {
			for (const [uid, node] of this.graph.entries()) {
				console.log(`\n👤 User ${uid}:`);
				printCollection("  👥 Friends", node.friends);
				printCollection("  📥 Incoming Requests", node.incomingRequests);
				printCollection("  📤 Outgoing Requests", node.outgoingRequests);
			}
		}

		// ---------- REQUESTS CACHE ----------
		console.log("\n\n📝 REQUESTS CACHE");
		console.log("─".repeat(42));
		if (this.requests.size === 0) console.log("  (empty)");
		else {
			let i = 0;
			for (const req of this.requests.values()) {
				const statusIcon =
					req.status === FriendRequestStatus.ACCEPTED ? "✅" :
						req.status === FriendRequestStatus.PENDING ? "⏳" : "❌";
				console.log(`  [${i++}] ${statusIcon} ${req.sender_id} → ${req.receiver_id} (${req.request_id})`);
			}
		}

		// ---------- ID TO REQUESTS ----------
		console.log("\n\n🔗 ID TO REQUESTS");
		console.log("─".repeat(42));
		if (this.idToRequests.size === 0) console.log("  (empty)");
		else {
			for (const [uid, set] of this.idToRequests.entries()) {
				printCollection(`  User ${uid}`, set);
			}
		}

		console.log("\n" + "═".repeat(42) + "\n");
	}

}
