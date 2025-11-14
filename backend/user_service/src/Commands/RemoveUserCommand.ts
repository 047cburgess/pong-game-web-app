import { FriendManager } from "../Managers/FriendManager";
import { UserManager, user_id } from "../Managers/UserManager";
import { CancelFriendRequestCommand } from "./CancelFriendRequestCommand";
import { CommandBase, CommandManager, CommandResult } from "../Managers/CommandManager";
import { RefuseFriendRequestCommand } from "./RefuseFriendRequestCommand";
import { RemoveFriendCommand } from "./RemoveFriendCommand";
import { AvatarManager } from "../Managers/AvatarManager";

@CommandManager.register(UserManager, FriendManager, AvatarManager)
export class RemoveUserCommand extends CommandBase {
	constructor(
		private userManager: UserManager,
		private friendManager: FriendManager,
		private avatarManager: AvatarManager
	) { super() }


	execute(user_id: user_id): CommandResult {
		const user = this.userManager.getOrLoadUserByID(user_id)!;
		const userNode = this.friendManager.getUserNode(user_id);
		if (userNode) {
			for (const id of userNode!.friends)
				CommandManager.get(RemoveFriendCommand).execute(user_id, id);
			for (const id of userNode.outgoingRequests)
				CommandManager.get(CancelFriendRequestCommand).execute(user_id, id);
			for (const id of userNode.incomingRequests)
				CommandManager.get(RefuseFriendRequestCommand).execute(user_id, id);
		}

		this.avatarManager.removeAvatar(user.name);
		this.userManager.removeUser(user_id);
		this.friendManager.removeUser(user_id);

		return { success: true, errors: [] };
	}
}