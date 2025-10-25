import { FriendManager } from "../Friend/FriendManager";
import { MessagesQueueManager } from "../MesssageQueue/MessagesQueueManager";
import { PublicUserData, user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandManager, CommandResult } from "./CommandManager";

@CommandManager.register(UserManager, FriendManager, MessagesQueueManager)
export class GetIncomingFriendRequestCommand extends CommandBase{
	constructor(
		private userManager : UserManager,
		private friendManager : FriendManager,
		private messagesManager : MessagesQueueManager
	){super()}

	 execute(user_id : user_id) : CommandResult<PublicUserData[]>{
		const friendList : PublicUserData[] = [];
		const userNode = this.friendManager.getUserNode(user_id);
		
		if(!userNode)
			return ({success : false, errors : [/* placeholder again */]})
		const pendinglist = userNode.incomingRequests;
		for(const friend_id of pendinglist){
			const friend =  this.userManager.getPublicByID(friend_id);
			if(friend)
				friendList.push(friend);
		}
		return ({success: true, errors : [], data : friendList});
	}
}