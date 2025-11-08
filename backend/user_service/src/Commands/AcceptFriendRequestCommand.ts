import { FriendManager, FriendRequestStatus } from "../Managers/FriendManager";
import { UserManager, user_id } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager, FriendManager)
export class AcceptFriendRequestCommand extends CommandBase {

	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
	) { super() }

	execute(receiver_id: user_id, sender_id: user_id): CommandResult {
		const receiver = this.userManager.getOrLoadUserByID(receiver_id);
		const receiverNode = this.friendManager.getUserNode(receiver_id);
		const senderNode = this.friendManager.getUserNode(sender_id);

		if (receiver_id === sender_id)
			return { success: false, errors: [FriendRequestError.REQUEST_SELF] };
		if (!receiver || !receiverNode)
			return { success: false, errors: [FriendRequestError.USER_UNDEFINED] };
		if (receiverNode.friends.has(sender_id))
			return { success: false, errors: [FriendRequestError.FRIEND_ALREADY] };
		if (!receiverNode.incomingRequests.has(sender_id))
			return { success: false, errors: [FriendRequestError.REQUEST_UNDEFINED] };

		this.friendManager.upsertUpdate({
			sender_id: sender_id,
			receiver_id: receiver_id,
			status: FriendRequestStatus.ACCEPTED
		});

		return { success: true, errors: [] };
	}
}