import { Messages, MessagesQueueManager } from "../MesssageQueue/MessagesQueueManager";
import { user_id } from "../UserData/User";
import { UserManager } from "../UserData/UserManager";
import { CommandBase, CommandResult } from "./CommandManager";

export class GetQueuedMessagesCommand extends CommandBase{
	constructor(
		private userManager : UserManager,
		private messagesManager : MessagesQueueManager
	)
	{super()}

	 execute(user_id : user_id) : CommandResult<Messages[]>{
		const msg = this.messagesManager.fetch(user_id);
		return ({success : true, errors : [], data : msg});
	}
}