
export type user_id = number;

export interface PrivateInfo {
	email? : string,
}

export interface CommonCredentialsInfo {
	id : user_id,
	email : string,
	username : string,
	TwoFA : number
}

export type CredentialsInfo = CommonCredentialsInfo & UserCredentialsInfo;
export type  OauthCredentialsInfo = CommonCredentialsInfo & UserOauthInfo;

export interface UserCredentialsInfo {
	id : user_id, //internal_id shared to other microservices
	password : string, //hashed
} 

export interface  UserOauthInfo {
	id : user_id,
	OauthProvider : string,
	externalId : string
}

