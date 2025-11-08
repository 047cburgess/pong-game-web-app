import { FriendManager } from "../Managers/FriendManager";
import { UserManager, PublicInfo, user_id  } from "../Managers/UserManager";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";


@CommandManager.register(UserManager, FriendManager)
export class GetOutgoingFriendRequestCommand extends CommandBase{
	constructor(
		private userManager : UserManager,
		private friendManager : FriendManager,
	){super()}

	execute(user_id : user_id) : CommandResult<PublicInfo[]>{
		let friendList : PublicInfo[];

		const pendinglist = this.friendManager.getOutgoingRequests(user_id);

		friendList = this.userManager.getPublicBatchByIDs(Array.from(pendinglist));

		return ({success: true, errors : [], data : friendList});
	}
}