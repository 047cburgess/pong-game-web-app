import { FriendManager, FriendRequest, FriendRequestStatus } from "../Friend/FriendManager";
import { MessagesQueueManager } from "../MesssageQueue/MessagesQueueManager";
import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";
import { AcceptFriendRequestCommand } from "./AcceptFriendRequestCommand";

export enum FriendRequestError {
    SelfRequest = "SelfRequest",
    UndefinedUser = "UndefinedUser",
    AlreadyFriend = "AlreadyFriend",
    AlreadyRequest = "AlreadyRequested",
}

@CommandManager.register(UserManager, FriendManager, MessagesQueueManager)
export class RequestFriendCommand extends CommandBase {

	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
		private messageManager: MessagesQueueManager
	) { super() }

	execute(sender_id: user_id, receiver_id: user_id): CommandResult {
		const sender = this.userManager.getOrLoadUserByID(sender_id);
		const senderNode = this.friendManager.getUserNode(sender_id);

		if (sender_id === receiver_id)
			return { success: false, errors: [FriendRequestError.SelfRequest] };

		if (!sender || !senderNode)
			return { success: false, errors: [FriendRequestError.UndefinedUser] }; //should never happen since we assume onUserSeen as prehandler 
		if(senderNode.friends.has(receiver_id))
			return { success: false, errors: [FriendRequestError.AlreadyFriend]};
		if(senderNode.outgoingRequests.has(receiver_id))
			return { success: false, errors: [FriendRequestError.AlreadyRequest]}; // should not happen either if client isn't fraudulent 
		
		if (senderNode.incomingRequests.has(receiver_id)) {
			return CommandManager.get(AcceptFriendRequestCommand).execute(sender_id, receiver_id);
		}

		this.friendManager.upsertUpdate({
			sender_id: sender_id,
			receiver_id: receiver_id,
			status: FriendRequestStatus.PENDING,
		});
		
		if (this.userManager.hasCached(receiver_id)) {
			this.messageManager.push(receiver_id, { type: "Friend Request Received", data: { from: sender.name } })
		}

		return { success: true, errors: [] };
	}

}
