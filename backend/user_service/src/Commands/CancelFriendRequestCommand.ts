import { FriendManager, FriendRequestStatus } from "../Managers/FriendManager";
import { UserManager, user_id } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager, FriendManager)
export class CancelFriendRequestCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
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

		this.friendManager.upsertUpdate({
			sender_id: sender_id,
			receiver_id: receiver_id,
			status: FriendRequestStatus.REFUSED
		});

		return { success: true, errors: [] };
	}
}