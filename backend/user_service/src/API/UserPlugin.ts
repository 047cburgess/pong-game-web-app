import { FastifyInstance } from "fastify";
import { onUserSeen, resolveUserId } from "./preHandler";
import { CommandManager } from "../Managers/CommandManager";
import { GetUserDataCommand } from "../Commands/GetUserDataCommand";
import { EditUsernameCommand } from "../Commands/EditUsernameCommand";
import { RemoveUserCommand } from "../Commands/RemoveUserCommand";

export async function userPlugin(server: FastifyInstance) {

	/*
		returns userdata of sender 
	*/
	server.get("/user", { preHandler: [onUserSeen] }, async (request, reply) => {
		const user_id = request.sender_id!;
		const result = CommandManager.get(GetUserDataCommand).execute(user_id);
		if (result.success)
			return reply.status(200).send(result.data!);
		else
			return reply.status(404).send();
	});

	//works with ids too 
	server.get("/user/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
		const user_id = request.user_id!;
		const result = CommandManager.get(GetUserDataCommand).execute(user_id);
		if (result.success)
			return reply.status(200).send(result.data!);
		else
			return reply.status(404).send();
	});

	/*
		change username
	*/
	server.put("/user/username", { preHandler: onUserSeen }, async (request, reply) => {
		const user_id = request.sender_id!;
		const username = (request.body as { username: string }).username;
		const result = CommandManager.get(EditUsernameCommand).execute(user_id, username!);
		if (result.success)
			return reply.status(204).send();
		else
			return reply.status(404).send(result.errors);
	});

	server.delete("/user", { preHandler: onUserSeen }, async (request, reply) => {
		const user_id = request.sender_id!;
		const result = CommandManager.get(RemoveUserCommand).execute(user_id);
		if (result.success)
			return reply.status(204).send();
	});
}