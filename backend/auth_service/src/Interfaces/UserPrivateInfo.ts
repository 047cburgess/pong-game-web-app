
export type user_id = number;

export interface PrivateInfo {
	email? : string,
}

export interface CredentialsInfo {
	id : user_id, //internal_id shared to other microservices
	email : string, //required for 2FA
	username : string,
	password : string, //hashed
	TwoFA? : number // change to number as sqlite no like boolean
} 

export interface OauthCredentialsInfo {
	id : user_id,
	OauthProvider : string,
	externalId : string,
	email : string,
	TwoFA : number
}

