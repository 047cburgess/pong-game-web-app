import { UserManager, PublicInfo, user_id } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager)
export class GetUserDataCommand extends CommandBase {
	constructor(
		private userManager: UserManager
	) { super() }

	execute(user_id: user_id): CommandResult<PublicInfo> {
		const user = this.userManager.getPublicByID(user_id);
		if (!user)
			return ({ success: false, errors: [FriendRequestError.USER_UNDEFINED] });
		return ({ success: true, errors: [], data: user });
	}
}