import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify"
import { CommandManager, CommandResult } from "../Managers/CommandManager";
import { GetUserIdCommand } from "../Commands/GetUserIdCommand";
import { OnUserSeenCommand } from "../Commands/OnUserSeenCommand";

declare module 'fastify' {
	interface FastifyRequest {
		sender_id?: number;
		user_id?: number;
	}
}



export interface ParamsId {
	id: string;
}

export interface Params {
	username: string;
}

export const resolveUserId = (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
	const username = (request.params as Params).username;

	if (/[a-zA-Z]/.test(username)) {
		const result: CommandResult<number> = CommandManager.get(GetUserIdCommand).execute(username);
		if (result.success && result.data !== undefined) {
			request.user_id = result.data;

		} else {
			return reply.status(404).send({ error: "User not found" });
		}
	}
	else {
		request.user_id = parseInt(username);
	}
	done();
};

export const onUserSeen = (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
	// instead of jwt extraction for debug purpose only
	console.log(request.headers['x-user-id'] as string);
	const testSenderId = request.headers['x-user-id'];
	if (testSenderId) {
		request.sender_id = parseInt(testSenderId as string);
	}
	
	const sender_id = request.sender_id!;
	if (!sender_id) return reply.status(401).send({ error: "Missing sender_id" });
	CommandManager.get(OnUserSeenCommand).execute(sender_id);
	done();
};