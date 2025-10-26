import { FriendManager, FriendRequestStatus } from "../Friend/FriendManager";
import { MessagesQueueManager, MessagesTypes } from "../MesssageQueue/MessagesQueueManager";
import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager, FriendManager, MessagesQueueManager)
export class CancelFriendRequestCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
		private messagesManager: MessagesQueueManager
	) { super() }

	execute(sender_id: user_id, receiver_id: user_id): CommandResult {
		const sender = this.userManager.getOrLoadUserByID(sender_id);
		const senderNode = this.friendManager.getUserNode(sender_id);

		if (!sender || !senderNode)
			return { success: false, errors: [FriendRequestError.USER_UNDEFINED] };
		if (senderNode.friends.has(receiver_id))
			return { success: false, errors: [FriendRequestError.FRIEND_ALREADY] };
		if (!senderNode.outgoingRequests.has(receiver_id))
			return { success: false, errors: [FriendRequestError.REQUEST_UNDEFINED] };
		
		if (this.userManager.hasCached(receiver_id))
			this.messagesManager.push(receiver_id, { type: MessagesTypes.FRIENDREQUEST_CANCELED, data: { name: sender.name } });
		
		this.friendManager.upsertUpdate({
			sender_id: sender_id,
			receiver_id: receiver_id,
			status: FriendRequestStatus.REFUSED
		});

		return { success: true, errors: [] };
	}
}