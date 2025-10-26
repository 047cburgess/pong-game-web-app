import { PublicUserData, user_id, UserData } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager)
export class GetUserDataCommand extends CommandBase {
	constructor(
		private userManager: UserManager
	) { super() }

	execute(user_id: user_id): CommandResult<PublicUserData> {
		const user = this.userManager.getPublicByID(user_id);
		if (!user)
			return ({ success: false, errors: [FriendRequestError.USER_UNDEFINED] });
		return ({ success: true, errors: [], data: user });
	}
}