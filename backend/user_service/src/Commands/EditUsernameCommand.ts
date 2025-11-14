import { UserManager, user_id } from "../Managers/UserManager";
import { CommandBase, CommandManager } from "../Managers/CommandManager";
import { CommandResult } from "../Managers/CommandManager";
import { FriendManager } from "../Managers/FriendManager";
import { AvatarManager } from "../Managers/AvatarManager";

export interface UserValidationResult {
	success: boolean;
	errors: string[];
}

export enum UsernameErrors {
	TOO_SHORT = "TOO_SHORT",
	TOO_LONG = "TOO_LONG",
	INVALID_CHARACTERS = "INVALID_CHARACTERS", // caractères invalides
	MUST_CONTAIN_LETTERS = "MUST_CONTAIN_LETTERS",
	ALREADY_TAKEN = "ALREADY_TAKEN",
	DOES_NOT_EXIST = "DOES_NOT_EXIST",
}



@CommandManager.register(UserManager, AvatarManager)
export class EditUsernameCommand extends CommandBase {

	private readonly VALID_USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
	private readonly USERNAME_MIN_LEN = 3;
	private readonly USERNAME_MAX_LEN = 32;

	constructor(
		private userManager: UserManager,
		private avatarManager: AvatarManager
	) { super(); }

	private validateUsername(username: string): UserValidationResult {
		const result: UserValidationResult = { success: false, errors: [] };

		if (username === "default")
			result.errors.push(UsernameErrors.ALREADY_TAKEN);
		if (!username || username.length < this.USERNAME_MIN_LEN)
			result.errors.push(UsernameErrors.TOO_SHORT);
		if (username.length > this.USERNAME_MAX_LEN)
			result.errors.push(UsernameErrors.TOO_LONG);
		if (!this.VALID_USERNAME_REGEX.test(username))
			result.errors.push(UsernameErrors.INVALID_CHARACTERS);
		if (!/[a-zA-Z]/.test(username))
			result.errors.push(UsernameErrors.MUST_CONTAIN_LETTERS);
		if (result.errors.length === 0) result.success = true;
		return result;
	}

	execute(user_id: user_id, username: string): CommandResult {
		let previousname = "";
		const validation = this.validateUsername(username);
		if (!validation.success) {
			return validation;
		}

		const existing = this.userManager.usernameExists(username);
		if (existing) {
			return { success: false, errors: [UsernameErrors.ALREADY_TAKEN] };
		}

		const user = this.userManager.getOrLoadUserByID(user_id);
		if (user) {
			previousname = user.name;
			user.name = username;
			this.userManager.saveUser(user_id); //need to decide when to save, do i prefer batch operation or on modification saves
			this.userManager.removeName(previousname);
		}
		else
			return { success: false, errors: [UsernameErrors.DOES_NOT_EXIST] };

		this.avatarManager.renameAvatar(previousname, username);
		return { success: true, errors: [] };
	}
}
