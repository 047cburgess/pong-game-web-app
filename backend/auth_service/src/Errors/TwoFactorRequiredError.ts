
export class TwoFactorRequiredError extends Error {
    public readonly token: string;
    public readonly status: number = 401;
	public readonly tosend: {status : string} = {status : "2FA_REQUIRED"};

    constructor(token: string) {
        super("Two-Factor Authentication is required to proceed."); 
        
        this.name = 'TwoFactorRequiredError';
        this.token = token;

        Object.setPrototypeOf(this, TwoFactorRequiredError.prototype);
    }
}