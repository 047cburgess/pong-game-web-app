import { CommandBase, CommandManager } from "../Managers/CommandManager";
import { FriendManager } from "../Managers/FriendManager";
import { UserManager } from "../Managers/UserManager";

@CommandManager.register(UserManager, FriendManager)
export class ClearCacheCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager) { super(); }

	execute() {
		//this.userManager.printUserManager();
		//this.friendManager.printFullState();
		const inactive_users = this.userManager.unloadInactiveUsers();
		this.userManager.saveAll();
		this.friendManager.saveAll();
		for(const user_id of inactive_users)
			this.friendManager.unloadUser(user_id);
	}
}