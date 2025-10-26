import { FriendManager } from "../Friend/FriendManager";
import { PublicUserData, user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";


@CommandManager.register(UserManager, FriendManager)
export class GetOutgoingFriendRequestCommand extends CommandBase{
	constructor(
		private userManager : UserManager,
		private friendManager : FriendManager,
	){super()}

	execute(user_id : user_id) : CommandResult<PublicUserData[]>{
		let friendList : PublicUserData[];

		const pendinglist = this.friendManager.getOutgoingRequests(user_id);

		friendList = this.userManager.getPublicBatchByIDs(Array.from(pendinglist));

		return ({success: true, errors : [], data : friendList});
	}
}