import { FriendManager } from "../Friend/FriendManager";
import { MessagesQueueManager } from "../MesssageQueue/MessagesQueueManager";
import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { UserStatus } from "../UserData/UserStatus";
import { CommandBase, CommandManager } from "./CommandManager";

@CommandManager.register(FriendManager, UserManager, MessagesQueueManager)
export class OnUserSeenCommand extends CommandBase {
	constructor(
		private friendManager: FriendManager,
		private userManager: UserManager,
		private notifManager: MessagesQueueManager) { super(); }

	execute(userId: user_id) {
		const previousStatus = this.userManager.getUserByID(userId)?.status || UserStatus.OFFLINE;
		const user = this.userManager.onUserSeen(userId);
		this.friendManager.loadUser(userId);

		if (previousStatus !== user.status) {
			const friends = this.friendManager.getFriendList(userId);
			for (const friendId of friends) {
				if (this.userManager.hasCached(friendId)) {
					this.notifManager.push(friendId, { type: "friend status update", data: this.userManager.toPublic(user) });
				}
			}
		}
	}
}


/*
	Could add a OnFirstTimeSeeing to manage new usercreation

	onUserSeen, First try to load the users data into cache
	do nothing if already present
	then 


*/