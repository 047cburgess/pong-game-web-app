import { FriendManager } from "../Friend/FriendManager";
import { PublicUserData, user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandResult } from "./CommandManager";

export class GetFriendsData extends CommandBase {

	constructor(private friendManager: FriendManager, private userManager: UserManager) {
		super();
	}

	//should use user_id or username as a param ? idk
	 execute(user_id: user_id) : CommandResult<PublicUserData[]>{
		const result : CommandResult<PublicUserData[]> = {success : false, errors : [], data:[]}
		const ids_list = this.friendManager.getFriendList(user_id);
		for (const friend_id of ids_list) {
			const friend =  this.userManager.getPublicByID(friend_id);
			if(friend){
				result.data?.push(friend);
				result.success = true;
			}
		}
		return result;
	}

}