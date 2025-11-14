import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { FriendManager } from "../Managers/FriendManager";
import { user_id, UserManager } from "../Managers/UserManager";

@CommandManager.register(UserManager, FriendManager)
export class GetFriendshipStateCommand extends CommandBase{

	constructor(
		private userManager : UserManager,
		private friendManager : FriendManager
	){super()};

	execute(user_id: user_id, friend_id : user_id) : CommandResult<{state : string}> {
		let result : CommandResult<{state : string}> = {success : true, errors : []};
		const user = this.userManager.getOrLoadUserByID(user_id);
		const Usernode = this.friendManager.getUserNode(user_id);
		if(Usernode?.friends.has(friend_id)){
			result.data = {state : 'friends'};}
		else if(Usernode?.incomingRequests.has(friend_id)){
			result.data = {state : 'incoming'};}
		else if(Usernode?.outgoingRequests.has(friend_id)){
			result.data = {state : 'outgoing'};}
		else
			result.success = false;
		return result;
	}
}