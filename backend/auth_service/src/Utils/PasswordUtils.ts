import bcrypt from 'bcryptjs'
import { Result } from '../Interfaces/Result';


export enum PasswordErrors {
	TOO_SHORT = "TOO_SHORT",
	TOO_LONG = "TOO_LONG",
	MISSING_UPPERCASE = "MISSING_UPPERCASE",
	MISSING_LOWERCASE = "MISSING_LOWERCASE",
	MISSING_NUMBER = "MISSING_NUMBER",
	MISSING_SPECIAL = "MISSING_SPECIAL"
}

export class PasswordUtils {
	private static readonly HAS_UPPERCASE = /[A-Z]/;
	private static readonly HAS_LOWERCASE = /[a-z]/;
	private static readonly HAS_NUMBER = /[0-9]/;
	private static readonly HAS_SPECIAL = /[!@#$%^&*(),.?":{}|<>-_]/;
	private static readonly PASSWORD_MIN_LEN = 8;
	private static readonly PASSWORD_MAX_LEN = 64;
	private static readonly SALT_ROUNDS = 12;

	static validatePassword(password: string): Result {
		const result: Result = { success: false, errors: [] };

		if (!password || password.length < this.PASSWORD_MIN_LEN)
			result.errors.push(PasswordErrors.TOO_SHORT);
		if (password.length > this.PASSWORD_MAX_LEN)
			result.errors.push(PasswordErrors.TOO_LONG);
		if (!this.HAS_UPPERCASE.test(password))
			result.errors.push(PasswordErrors.MISSING_UPPERCASE);
		if (!this.HAS_LOWERCASE.test(password))
			result.errors.push(PasswordErrors.MISSING_LOWERCASE);
		if (!this.HAS_NUMBER.test(password))
			result.errors.push(PasswordErrors.MISSING_NUMBER);
		if (!this.HAS_SPECIAL.test(password))
			result.errors.push(PasswordErrors.MISSING_SPECIAL);
		if (result.errors.length === 0)
			result.success = true;
		return result;
	}

	static async hash(password: string): Promise<string> {
		return bcrypt.hash(password, this.SALT_ROUNDS);
	}

	static async compare(password: string, hash: string): Promise<boolean> {
		return bcrypt.compareSync(password, hash);
	}
}