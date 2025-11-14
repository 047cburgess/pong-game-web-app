import { Result } from "../Interfaces/Result";

export enum UsernameErrors {
	TOO_SHORT = "TOO_SHORT",
	TOO_LONG = "TOO_LONG",
	INVALID_CHARACTERS = "INVALID_CHARACTERS",
	MUST_CONTAIN_LETTERS = "MUST_CONTAIN_LETTERS",
	ALREADY_TAKEN = "ALREADY_TAKEN",
	DOES_NOT_EXIST = "DOES_NOT_EXIST",
}

export class UsernameUtils {

	private static readonly VALID_USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
	private static readonly USERNAME_MIN_LEN = 3;
	private static readonly USERNAME_MAX_LEN = 32;

	static validateUsername(username: string): Result {
		const result: Result = { success: false, errors: [] };

		if (username === "default" || username === "user")
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
}