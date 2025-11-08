import { FriendManager, FriendRequestStatus } from "../Managers/FriendManager";
import { user_id, UserManager } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager, FriendManager)
export class RefuseFriendRequestCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
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

		this.friendManager.upsertUpdate({
			sender_id: sender_id,
			receiver_id: receiver_id,
			status: FriendRequestStatus.REFUSED
		});

		return { success: true, errors: [] };
	}
}