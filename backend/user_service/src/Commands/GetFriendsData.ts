import { FriendManager } from "../Managers/FriendManager";
import { UserManager,PublicInfo, user_id } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";

@CommandManager.register(FriendManager, UserManager)
export class GetFriendsData extends CommandBase {

	constructor(private friendManager: FriendManager, private userManager: UserManager) {
		super();
	}

	execute(user_id: user_id): CommandResult<PublicInfo[]> {
		const result: CommandResult<PublicInfo[]> = { success: false, errors: [], data: [] }
		this.friendManager.loadUser(user_id);
		const ids_list = this.friendManager.getFriendList(user_id);
		result.data = this.userManager.getPublicBatchByIDs(ids_list);
		result.success = true;
		return result;
	}

}