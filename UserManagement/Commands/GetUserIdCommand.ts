import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandResult } from "./CommandManager"

export class GetUserIdCommand extends CommandBase{

	constructor(private userManager : UserManager)
	{super()}

	 execute(username : string) : CommandResult<user_id>{	
		const user =  this.userManager.getOrLoadUserByName(username);
		if(!user)
			return {success:false, errors : ["No corresponding User"]};
		return {success : true, errors : [], data : user.user_id};
	}
}