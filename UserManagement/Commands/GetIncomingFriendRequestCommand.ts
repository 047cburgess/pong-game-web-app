import { FriendManager } from "../Friend/FriendManager";
import { MessagesQueueManager } from "../MesssageQueue/MessagesQueueManager";
import { PublicUserData, user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";
import { FriendRequestError } from "./RequestFriendCommand";

@CommandManager.register(UserManager, FriendManager, MessagesQueueManager)
export class GetIncomingFriendRequestCommand extends CommandBase{
	constructor(
		private userManager : UserManager,
		private friendManager : FriendManager,
	){super()}

	execute(user_id : user_id) : CommandResult<PublicUserData[]>{
		let friendList : PublicUserData[];

		const pendinglist = this.friendManager.getPendingRequests(user_id);

		friendList = this.userManager.getPublicBatchByIDs(Array.from(pendinglist));
		
		return ({success: true, errors : [], data : friendList});
	}
}