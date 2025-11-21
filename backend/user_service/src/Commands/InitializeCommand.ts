import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { user_id, UserManager } from "../Managers/UserManager";

@CommandManager.register(UserManager)
export class initializeCommand extends CommandBase {
	constructor(
		private userManager: UserManager
	) { super() }

	execute(user_id: user_id, username : string, avatarUrl?:string): CommandResult {
		const user = this.userManager.getPublicByID(user_id);
		if (user || !username || !user_id)
			return ({ success: false, errors: ["USER_ALREADY EXIST"] });
		this.userManager.createDefault(user_id, username, avatarUrl);
		return ({ success: true, errors: [] });
	}
}