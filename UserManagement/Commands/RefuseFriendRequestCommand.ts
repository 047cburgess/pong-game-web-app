import { FriendManager, FriendRequestStatus } from "../Friend/FriendManager";
import { MessagesQueueManager } from "../MesssageQueue/MessagesQueueManager";
import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandResult } from "./CommandManager";

export class RefuseFriendRequestCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
		private messagesManager: MessagesQueueManager
	) { super() }

	 execute(receiver_id: user_id, sender_id: user_id) : CommandResult {
		const receiver = this.userManager.getUserByID(receiver_id);
		const receiverNode = this.friendManager.getUserNode(receiver_id);

		if (!receiver || !receiverNode || receiverNode.friends.has(sender_id) || !receiverNode.incomingRequests.has(sender_id))
			return {success : false, errors: [/* placeholder again */]};
		
		if (this.userManager.hasCached(sender_id))
			this.messagesManager.push(sender_id, {type: "FriendRequest Refused", data : {name : receiver.name}});

		this.friendManager.upsertUpdate({ 
			sender_id: sender_id, 
			receiver_id: receiver_id, 
			status: FriendRequestStatus.REFUSED 
		});

		return {success:true, errors:[]};
	}
}