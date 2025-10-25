import Fastify, { FastifyReply, FastifyRequest } from "fastify"
import { CommandManager } from "../Commands/CommandManager";
import { GetUserIdCommand } from "../Commands/GetUserIdCommand";
import { OnUserSeenCommand } from "../Commands/OnUserSeenCommand";

declare module 'fastify' {
	interface FastifyRequest {
		sender_id?: number;
		user_id?: number;
	}
}

export interface Params {
	username: string;
}

export const resolveUserId = (request: FastifyRequest, reply: FastifyReply) => {
	const username = (request.params as Params).username;
	const result = CommandManager.get(GetUserIdCommand).execute(username);
	if (result.success) {
		request.user_id = result.data!; // injecte user_id
	} else {
		return reply.status(404).send(result.errors);
	}
};

export const onUserSeen = (request: FastifyRequest, reply: FastifyReply) => {
	const sender_id = request.sender_id!;
	if (!sender_id) return reply.status(401).send({ error: "Missing sender_id" });
	CommandManager.get(OnUserSeenCommand).execute(sender_id);
};