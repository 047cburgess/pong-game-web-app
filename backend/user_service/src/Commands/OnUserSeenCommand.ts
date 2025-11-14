import { FriendManager } from "../Managers/FriendManager";
import { user_id, UserManager, UserStatus } from "../Managers/UserManager";
import { CommandBase, CommandManager } from "../Managers/CommandManager";

@CommandManager.register(FriendManager, UserManager)
export class OnUserSeenCommand extends CommandBase {
	constructor(
		private friendManager: FriendManager,
		private userManager: UserManager
	) { super(); }

	execute(userId: user_id) {
		this.userManager.onUserSeen(userId);
		this.friendManager.loadUser(userId);
	}
}


/*
	Could add a OnFirstTimeSeeing to manage new usercreation

	onUserSeen, First try to load the users data into cache
	do nothing if already present
	then 


*/