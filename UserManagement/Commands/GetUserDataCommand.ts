import { PublicUserData, user_id, UserData } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandResult } from "./CommandManager";

export class GetUserDataCommand extends CommandBase {
	constructor(
		private userManager : UserManager
	) 
	{super()}

	 execute(user_id : user_id) : CommandResult<PublicUserData>{
		const user =  this.userManager.getPublicByID(user_id);
		if(!user)
			return ({success:false, errors : ["No corresponding User"]});
		return ({success : true, errors : [], data : user});
	}
}