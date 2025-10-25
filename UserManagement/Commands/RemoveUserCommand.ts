import { FriendManager } from "../Friend/FriendManager";
import { MessagesQueueManager } from "../MesssageQueue/MessagesQueueManager";
import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CancelFriendRequestCommand } from "./CancelFriendRequestCommand";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";
import { RefuseFriendRequestCommand } from "./RefuseFriendRequestCommand";
import { RemoveFriendCommand } from "./RemoveFriendCommand";


export class RemoveUserCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
		private messageManager: MessagesQueueManager
	) { super() }


	execute(user_id: user_id): CommandResult {
		const username = (this.userManager.getOrLoadUserByID(user_id))!.name;
		const userNode = this.friendManager.getUserNode(user_id);
		if (userNode) {
			for (const id of userNode!.friends)
				CommandManager.get(RemoveFriendCommand).execute(user_id, id);
			for (const id of userNode.outgoingRequests)
				CommandManager.get(CancelFriendRequestCommand).execute(user_id, id);
			for (const id of userNode.incomingRequests)
				CommandManager.get(RefuseFriendRequestCommand).execute(user_id, id);
		}
		//this.avatarManager.removeAvatar(username); for when i implement the avatar manager
		this.userManager.removeUser(user_id);
		this.friendManager.removeUser(user_id);
		this.messageManager.clear(user_id);
		return { success: true, errors: [] };
	}
}