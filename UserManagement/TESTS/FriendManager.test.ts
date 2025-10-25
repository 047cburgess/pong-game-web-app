import { FriendManager, FriendRequestStatus } from "../Friend/FriendManager";
import { DbManager } from "../MOCKS/MOCK_DbManager";

import { user_id } from "../UserData/User";

//claude generated tests 
// ============ TESTS EXHAUSTIFS ============

function assert(condition: boolean, message: string) {
	if (!condition) {
		console.error(`❌ FAIL: ${message}`);
	} else {
		console.log(`✅ PASS: ${message}`);
	}
}

function runTests() {
	const db = new DbManager();
	const fm = new FriendManager(db);

	console.log("=== DÉBUT DES TESTS FRIENDMANAGER ===\n");

	// Test 1: État initial
	console.log("--- État initial ---");
	fm.printFullState();

	// Test 2: loadUser
	console.log("--- Test loadUser ---");
	fm.loadUser(1);
	fm.loadUser(2);
	fm.loadUser(3);
	assert(fm.getUserNode(1) !== undefined, "user 1 chargé");
	assert(fm.getUserNode(2) !== undefined, "user 2 chargé");
	assert(fm.getUserNode(3) !== undefined, "user 3 chargé");
	fm.printFullState();

	// Test 3: upsertUpdate - PENDING request
	console.log("--- Test upsertUpdate PENDING ---");
	fm.upsertUpdate({ sender_id: 1, receiver_id: 2, status: FriendRequestStatus.PENDING });
	const node2 = fm.getUserNode(2);
	assert(node2?.incomingRequests.has(1) === true, "user 2 a incoming request de 1");
	const node1 = fm.getUserNode(1);
	assert(node1?.outgoingRequests.has(2) === true, "user 1 a outgoing request vers 2");
	fm.printFullState();

	// Test 4: upsertUpdate - ACCEPTED request
	console.log("--- Test upsertUpdate ACCEPTED ---");
	fm.upsertUpdate({ sender_id: 1, receiver_id: 2, status: FriendRequestStatus.ACCEPTED });
	assert(node1?.friends.has(2) === true, "user 1 a 2 comme ami");
	assert(node2?.friends.has(1) === true, "user 2 a 1 comme ami");
	assert(!node1?.outgoingRequests.has(2), "plus de outgoing request");
	assert(!node2?.incomingRequests.has(1), "plus de incoming request");
	fm.printFullState();

	// Test 5: getFriendList
	console.log("--- Test getFriendList ---");
	const friends1 = fm.getFriendList(1);
	assert(friends1.length === 1, "user 1 a 1 ami");
	assert(friends1[0] === 2, "user 1 ami avec 2");

	// Test 6: Multiple pending requests
	console.log("--- Test multiple PENDING ---");
	fm.upsertUpdate({ sender_id: 3, receiver_id: 1, status: FriendRequestStatus.PENDING });
	fm.upsertUpdate({ sender_id: 2, receiver_id: 3, status: FriendRequestStatus.PENDING });
	const pending1 = fm.getPendingRequests(1);
	assert(pending1.length === 1, "user 1 a 1 pending request");
	assert(pending1[0] === 3, "pending de 3");
	fm.printFullState();

	// Test 7: upsertUpdate - REFUSED request
	console.log("--- Test upsertUpdate REFUSED ---");
	fm.upsertUpdate({ sender_id: 3, receiver_id: 1, status: FriendRequestStatus.REFUSED });
	const node1After = fm.getUserNode(1);
	assert(!node1After?.incomingRequests.has(3), "plus de incoming request de 3");
	fm.printFullState();

	// Test 8: Upsert existing request (modification)
	console.log("--- Test upsert modification ---");
	fm.upsertUpdate({ sender_id: 2, receiver_id: 3, status: FriendRequestStatus.ACCEPTED });
	const node3 = fm.getUserNode(3);
	assert(node3?.friends.has(2) === true, "user 3 ami avec 2");
	fm.printFullState();

	// Test 9: getFriendList après plusieurs ajouts
	console.log("--- Test getFriendList multiple ---");
	const friends2 = fm.getFriendList(2);
	assert(friends2.length === 2, "user 2 a 2 amis");
	assert(friends2.includes(1) && friends2.includes(3), "amis: 1 et 3");

	// Test 10: getPendingRequests vide
	console.log("--- Test getPendingRequests vide ---");
	const pending3 = fm.getPendingRequests(3);
	assert(pending3.length === 0, "user 3 sans pending requests");

	// Test 11: loadUser avec requests déjà en cache
	console.log("--- Test loadUser avec cache ---");
	fm.upsertUpdate({ sender_id: 1, receiver_id: 5, status: FriendRequestStatus.PENDING });
	fm.loadUser(5);
	const node5 = fm.getUserNode(5);
	assert(node5?.incomingRequests.has(1) === true, "user 5 a incoming de 1 depuis cache");
	fm.printFullState();

	// Test 12: unloadUser
	console.log("--- Test unloadUser ---");
	fm.unloadUser(5);
	assert(fm.getUserNode(5) === undefined, "user 5 déchargé");
	fm.printFullState();

	// Test 13: saveAll
	console.log("--- Test saveAll ---");
	fm.saveAll();
	fm.printFullState();

	// Test 14: removeUser
	console.log("--- Test removeUser ---");
	fm.removeUser(3);
	assert(fm.getUserNode(3) === undefined, "user 3 supprimé");
	fm.printFullState();

	// Test 15: Chain de requests
	console.log("--- Test chain requests ---");
	fm.loadUser(10);
	fm.loadUser(11);
	fm.loadUser(12);
	fm.upsertUpdate({ sender_id: 10, receiver_id: 11, status: FriendRequestStatus.PENDING });
	fm.upsertUpdate({ sender_id: 11, receiver_id: 12, status: FriendRequestStatus.PENDING });
	fm.upsertUpdate({ sender_id: 10, receiver_id: 11, status: FriendRequestStatus.ACCEPTED });
	const friends10 = fm.getFriendList(10);
	assert(friends10.includes(11), "10 ami avec 11");
	const pending12 = fm.getPendingRequests(12);
	assert(pending12.includes(11), "12 a pending de 11");
	fm.printFullState();

	console.log("=== FIN DES TESTS ===");
}

// ============ EXPORT ============

export { runTests };

if (require.main === module) {
	runTests();
}