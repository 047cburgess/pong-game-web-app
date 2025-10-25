import { UserStatus } from "./UserStatus" 

export type user_id = number

export interface PublicUserData {
	name: string;
	status: UserStatus;
	last_seen: number;
}

export interface UserData {
	name:string
	user_id : user_id, //snowflake id ? uuidv4? just an incremented number..?
	last_seen: number,
	status: UserStatus
}