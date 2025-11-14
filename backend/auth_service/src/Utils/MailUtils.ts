import { Result } from "../Interfaces/Result";

export class MailUtil {
	private static readonly EMAIL_MAXLENGTH = 320;
	private static readonly EMAIL_MINLENGTH = 6;
	private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

	static validateEmailAddress(email : string) : Result{
		email = email.trim();
		if(email.length > this.EMAIL_MAXLENGTH ||
			email.length < this.EMAIL_MINLENGTH ||
			!this.EMAIL_REGEX.test(email)
		) return {success: false, errors : ["INVALID_MAIL"]};
		return {success: true, errors:[]};
	}

}