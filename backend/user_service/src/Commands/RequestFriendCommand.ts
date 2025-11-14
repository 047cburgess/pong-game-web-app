import { FriendManager, FriendRequest, FriendRequestStatus } from "../Managers/FriendManager";
import { UserManager, user_id } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { AcceptFriendRequestCommand } from "./AcceptFriendRequestCommand";

export enum FriendRequestError {
	REQUEST_SELF = "SelfRequest",
	REQUEST_ALREADY = "AlreadyRequested",
	REQUEST_UNDEFINED = "UndefinedRequest",
	USER_UNDEFINED = "UndefinedUser",
	FRIEND_ALREADY = "AlreadyFriend",
	FRIEND_NOT = "NotFriend"
}

@CommandManager.register(UserManager, FriendManager)
export class RequestFriendCommand extends CommandBase {

	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager
	) { super() }

	execute(sender_id: user_id, receiver_id: user_id): CommandResult {
		const sender = this.userManager.getOrLoadUserByID(sender_id);
		const senderNode = this.friendManager.getUserNode(sender_id);

		if (sender_id === receiver_id)
			return { success: false, errors: [FriendRequestError.REQUEST_SELF] };

		if (!sender || !senderNode)
			return { success: false, errors: [FriendRequestError.USER_UNDEFINED] }; //should never happen since we assume onUserSeen as prehandler 
		if (senderNode.friends.has(receiver_id))
			return { success: false, errors: [FriendRequestError.FRIEND_ALREADY] };
		if (senderNode.outgoingRequests.has(receiver_id))
			return { success: false, errors: [FriendRequestError.FRIEND_ALREADY] }; // should not happen if client isn't fraudulent 

		if (senderNode.incomingRequests.has(receiver_id)) {
			return CommandManager.get(AcceptFriendRequestCommand).execute(sender_id, receiver_id);
		}

		this.friendManager.upsertUpdate({
			sender_id: sender_id,
			receiver_id: receiver_id,
			status: FriendRequestStatus.PENDING,
		});

		return { success: true, errors: [] };
	}

}
