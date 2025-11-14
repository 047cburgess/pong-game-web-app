import { FastifyInstance } from "fastify";
import { onUserSeen, resolveUserId } from "./preHandler";
import { CommandManager, CommandResult } from "../Managers/CommandManager";
import { GetFriendsData } from "../Commands/GetFriendsData";
import { GetIncomingFriendRequestCommand } from "../Commands/GetIncomingFriendRequestCommand";
import { GetOutgoingFriendRequestCommand } from "../Commands/GetOutgoingFriendRequestCommand";
import { RequestFriendCommand } from "../Commands/RequestFriendCommand";
import { CancelFriendRequestCommand } from "../Commands/CancelFriendRequestCommand";
import { AcceptFriendRequestCommand } from "../Commands/AcceptFriendRequestCommand";
import { RefuseFriendRequestCommand } from "../Commands/RefuseFriendRequestCommand";
import { RemoveFriendCommand } from "../Commands/RemoveFriendCommand";
import { GetFriendshipStateCommand } from "../Commands/GetFriendshipStateCommand";

export async function friendPlugin(server: FastifyInstance) {

	/*
		get friends public Data
	*/
	server.get("/user/friends", { preHandler: onUserSeen }, async (request, reply) => {
		const user_id = request.sender_id!;
		const result = CommandManager.get(GetFriendsData).execute(user_id);
		if (result.success)
			reply.status(200).send(result.data!);
		else
			reply.status(404).send(result.errors);
	})

	/*
		checks friendship state
	*/
	server.get("/user/friends/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
		const user_id = request.sender_id;
		const friend_id = request.user_id;

		const result = CommandManager.get(GetFriendshipStateCommand).execute(user_id!, friend_id!);
		if (result.success === true) {
			reply.status(200).send(result.data!);
		}
		else
			reply.status(404).send(result.errors);
	})

	/*
		get incoming(pending) friendrequest
	*/
	//could add a prehandler to manage the auth and user_id extraction
	server.get("/user/friends/requests", { preHandler: onUserSeen }, async (request, reply) => {
		const user_id = request.sender_id;
		const result = CommandManager.get(GetIncomingFriendRequestCommand).execute(user_id!);
		if (result.success)
			reply.status(200).send(result.data);
		else //probably will add a better error management
			reply.status(404).send(result.errors);
	})

	/*
		get outgoing(pending) friendrequest
	*/
	server.get("/user/friends/requests/outgoing", { preHandler: onUserSeen }, async (request, reply) => {
		const user_id = request.sender_id;
		const result = CommandManager.get(GetOutgoingFriendRequestCommand).execute(user_id!);
		if (result.success)
			reply.status(200).send(result.data);
		else //probably will add a better error management
			reply.status(404).send(result.errors);
	})

	/*
		creates and send a friendrequest
	*/
	server.post("/user/friends/requests/outgoing/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
		const sender_id = request.sender_id!;
		const receiver_id = request.user_id!;
		const result = CommandManager.get(RequestFriendCommand).execute(sender_id, receiver_id);
		if (result.success)
			reply.status(204).send();
		else //probably will add a better error management
			reply.status(404).send(result.errors);
	})

	/*
		cancel friend request sent and not already accepted
	*/
	server.delete("/user/friends/requests/outgoing/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
		const sender_id = request.sender_id!;
		const receiver_id = request.user_id!;
		const result = CommandManager.get(CancelFriendRequestCommand).execute(sender_id, receiver_id);
		if (result.success)
			reply.status(204).send();
		else //probably will add a better error management
			reply.status(404).send(result.errors);
	})

	/*
		accept incoming friend request from {username} could be separated
	*/
	server.put("/user/friends/requests/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
		const receiver_id = request.sender_id!;
		const sender_id = request.user_id!;
		const action = request.body as string;
		let result: CommandResult = CommandManager.get(AcceptFriendRequestCommand).execute(receiver_id, sender_id);
		if (result.success)
			reply.status(204).send();
		else //probably will add a better error management
			reply.status(404).send(result.errors);
	})

	/*
		refuse incoming friend request from {username}
	*/
	server.delete("/user/friends/requests/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
		const receiver_id = request.sender_id!;
		const sender_id = request.user_id!;
		const action = request.body as string;
		let result: CommandResult = CommandManager.get(RefuseFriendRequestCommand).execute(receiver_id, sender_id);
		if (result.success)
			reply.status(204).send();
		else //probably will add a better error management
			reply.status(404).send(result.errors);
	})

	/*
		remove friend
	*/
	server.delete("/user/friends/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
		const user_id = request.sender_id!;
		const friend_id = request.user_id!;
		console.log(`user_id = ${user_id}, friend_id = ${friend_id}`);
		const result = CommandManager.get(RemoveFriendCommand).execute(user_id, friend_id);
		if (result.success)
			reply.status(204).send();
		else //probably will add a better error management
			reply.status(404).send(result.errors);
	})

}