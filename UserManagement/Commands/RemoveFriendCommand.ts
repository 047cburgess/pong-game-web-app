import { FriendManager, FriendRequestStatus } from "../Friend/FriendManager";
import { MessagesQueueManager } from "../MesssageQueue/MessagesQueueManager";
import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandResult } from "./CommandManager";

export class RemoveFriendCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
		private messageManager: MessagesQueueManager
	) { super() }

	 execute(user_id: user_id, friend_id: user_id) : CommandResult{
		const user = this.userManager.getUserByID(user_id);
		const userNode = this.friendManager.getUserNode(user_id);
		const friendNode = this.friendManager.getUserNode(friend_id);

		if (!user || !userNode)
			return {success : false, errors: [/* placeholder again */]};
		if (!userNode.friends.has(friend_id))
			return {success : false, errors: [/* placeholder again */]};
		
		userNode.friends.delete(friend_id);
		
		if (this.userManager.hasCached(friend_id)) {
			this.messageManager.push(friend_id, {type : "Friend Removed", data: user.name})
		}

		this.friendManager.upsertUpdate({ 
			sender_id: friend_id,
			receiver_id: user_id,
			status: FriendRequestStatus.REFUSED
		});

		this.friendManager.upsertUpdate({ 
			sender_id: user_id,
			receiver_id: friend_id,
			status: FriendRequestStatus.REFUSED
		});

		return ({success: true, errors : []});
	}
}