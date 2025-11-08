import { UserManager, user_id } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager"
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager)
export class GetUserIdCommand extends CommandBase {

	constructor(private userManager: UserManager) { super() }

	execute(username: string): CommandResult<user_id> {
		const user = this.userManager.getOrLoadUserByName(username);
		if (!user)
			return { success: false, errors: [FriendRequestError.USER_UNDEFINED] };
		return { success: true, errors: [], data: user.id };
	}
}