import { FriendManager, FriendRequestStatus } from "../Friend/FriendManager";
import { MessagesQueueManager, MessagesTypes } from "../MesssageQueue/MessagesQueueManager";
import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager, FriendManager, MessagesQueueManager)
export class RefuseFriendRequestCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
		private messagesManager: MessagesQueueManager
	) { super() }

	execute(receiver_id: user_id, sender_id: user_id): CommandResult {
		const receiver = this.userManager.getOrLoadUserByID(receiver_id); //could be only get user since it should be loaded through onuserseen prehandler
		const receiverNode = this.friendManager.getUserNode(receiver_id);

		if (!receiver || !receiverNode)
			return { success: false, errors: [FriendRequestError.USER_UNDEFINED] };
		if (receiverNode.friends.has(sender_id))
			return { success: false, errors: [FriendRequestError.FRIEND_ALREADY] };
		if (!receiverNode.incomingRequests.has(sender_id))
			return { success: false, errors: [FriendRequestError.REQUEST_UNDEFINED] };

		if (this.userManager.hasCached(sender_id))
			this.messagesManager.push(sender_id, { type: MessagesTypes.FRIENDREQUEST_REFUSED, data: { name: receiver.name } });

		this.friendManager.upsertUpdate({
			sender_id: sender_id,
			receiver_id: receiver_id,
			status: FriendRequestStatus.REFUSED
		});

		return { success: true, errors: [] };
	}
}