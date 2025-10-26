import { FriendManager } from "../Friend/FriendManager";
import { PublicUserData, user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";

@CommandManager.register(FriendManager, UserManager)
export class GetFriendsData extends CommandBase {

	constructor(private friendManager: FriendManager, private userManager: UserManager) {
		super();
	}

	execute(user_id: user_id): CommandResult<PublicUserData[]> {
		const result: CommandResult<PublicUserData[]> = { success: false, errors: [], data: [] }
		this.friendManager.loadUser(user_id);
		const ids_list = this.friendManager.getFriendList(user_id);
		result.data = this.userManager.getPublicBatchByIDs(ids_list);
		result.success = true;
		return result;
	}

}