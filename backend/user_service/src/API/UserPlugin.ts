import { FastifyInstance } from "fastify";
import { onUserSeen, resolveUserId } from "./preHandler";
import { CommandManager } from "../Managers/CommandManager";
import { GetUserDataCommand } from "../Commands/GetUserDataCommand";
import { EditUsernameCommand } from "../Commands/EditUsernameCommand";
import { RemoveUserCommand } from "../Commands/RemoveUserCommand";
import { initializeCommand } from "../Commands/InitializeCommand";

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
	server.get("/users/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
		const user_id = request.user_id!;
		const result = CommandManager.get(GetUserDataCommand).execute(user_id);
		if (result.success)
			return reply.status(200).send(result.data!);
		else
			return reply.status(404).send();
	});

	server.post("/internal/user/initialize", async (request, reply) => {
		const body = (request.body as { user_id :string, username: string, avatarUrl : string | undefined });
		const user_id = Number(body.user_id);
		const username = body.username;
		const avatarUrl = body.avatarUrl;
		const result = CommandManager.get(initializeCommand).execute(user_id, username, avatarUrl);
		if (result.success)
			return reply.status(204).send();
		else
			return reply.status(404).send(result.errors);
	})
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