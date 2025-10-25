import Fastify, { FastifyReply, FastifyRequest } from "fastify"
import { CommandManager, CommandResult } from "../Commands/CommandManager";
import { GetFriendsData } from "../Commands/GetFriendsData"
import { Params, resolveUserId, onUserSeen } from "./preHandler";
import { GetIncomingFriendRequestCommand } from "../Commands/GetIncomingFriendRequestCommand";
import { GetOutgoingFriendRequestCommand } from "../Commands/GetOutgoingFriendRequestCommand";
import { RequestFriendCommand } from "../Commands/RequestFriendCommand";
import { CancelFriendRequestCommand } from "../Commands/CancelFriendRequestCommand";
import { AcceptFriendRequestCommand } from "../Commands/AcceptFriendRequestCommand";
import { RemoveFriendCommand } from "../Commands/RemoveFriendCommand";
import { RefuseFriendRequestCommand } from "../Commands/RefuseFriendRequestCommand";
import { GetQueuedMessagesCommand } from "../Commands/GetQueuedMessagesCommand";
import { GetUserDataCommand } from "../Commands/GetUserDataCommand";
import { EditUsernameCommand } from "../Commands/EditUsernameCommand";
import { RemoveUserCommand } from "../Commands/RemoveUserCommand";

const server = Fastify({ logger: true });


// TODO:	could add a more general reply method



/*
	get friends public Data
*/
server.get("/user/friends", { preHandler: onUserSeen }, async (request, reply) => {
	const user_id = request.sender_id!;
	const result =  CommandManager.get(GetFriendsData).execute(user_id);
	if (result.success)
		reply.status(200).send(result.data!);
	else
		reply.status(404).send(result.errors);
})

/*
	get friends public data, idk if we'll keep it ?
*/
server.get("/user/friends/:username", { preHandler: resolveUserId }, async (request, reply) => {
	const user_id = request.user_id;
	//should load user  data cause the public version does not assure that the user is loaded
	const result =  CommandManager.get(GetFriendsData).execute(user_id!);
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
server.get("/user/friends/requests", async (request, reply) => {
	const user_id = request.sender_id;
	const result =  CommandManager.get(GetIncomingFriendRequestCommand).execute(user_id!);
	if (result.success)
		reply.status(200).send(result.data);
	else //probably will add a better error management
		reply.status(404).send(result.errors);
})

/*
	get outgoing(pending) friendrequest
*/
server.get("/user/friends/requests/outgoing", async (request, reply) => {
	const user_id = request.sender_id;
	const result =  CommandManager.get(GetOutgoingFriendRequestCommand).execute(user_id!);
	if (result.success)
		reply.status(200).send(result.data);
	else //probably will add a better error management
		reply.status(404).send(result.errors);
})

/*
	creates and send a friendrequest
*/
server.post("/user/friends/request/outgoing/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
	const sender_id = request.sender_id!;
	const receiver_id = request.user_id!;
	const result =  CommandManager.get(RequestFriendCommand).execute(sender_id, receiver_id);
	if (result.success)
		reply.status(200).send(result.data);
	else //probably will add a better error management
		reply.status(404).send(result.errors);
})

/*
	cancel friend request sent and not already accepted
*/
server.delete("/user/friends/request/outgoing/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
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
server.put("/user/friends/request/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
	const receiver_id = request.sender_id!;
	const sender_id = request.user_id!;
	const action = request.body as string;
	let result: CommandResult =  CommandManager.get(AcceptFriendRequestCommand).execute(receiver_id, sender_id);
	if (result.success)
		reply.status(204).send();
	else //probably will add a better error management
		reply.status(404).send(result.errors);
})

/*
	refuse incoming friend request from {username}
*/
server.delete("/user/friends/request/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
	const receiver_id = request.sender_id!;
	const sender_id = request.user_id!;
	const action = request.body as string;
	let result: CommandResult =  CommandManager.get(RefuseFriendRequestCommand).execute(receiver_id, sender_id);
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
	const result =  CommandManager.get(RemoveFriendCommand).execute(user_id, friend_id);
	if (result.success)
		reply.status(204).send();
	else //probably will add a better error management
		reply.status(404).send(result.errors);
})

server.get("/user/friends/notifications", { preHandler: [onUserSeen] }, async (request, reply) => {
	const user_id = request.sender_id!;
	const result =  CommandManager.get(GetQueuedMessagesCommand).execute(user_id);
	if (result.success)
		return reply.status(200).send(result.data);
	else
		return reply.status(404).send(result.data);
});


/*
	returns user_id for username, should be an internal call only
*/
server.get("/user/:username/id", { preHandler: [resolveUserId] }, async (request, reply) => {
	return reply.status(200).send(request.user_id!);
});

/*
	returns userdata of sender 
*/
server.get("/user/", { preHandler: [onUserSeen] }, async (request, reply) => {
	const user_id = request.sender_id!;
	const result =  CommandManager.get(GetUserDataCommand).execute(user_id);
	if (result.success)
		return reply.status(200).send(result.data!);
	else
		return reply.status(404).send();
});

server.get("/user/:username", { preHandler: [resolveUserId, onUserSeen] }, async (request, reply) => {
	const user_id = request.user_id!;
	const result =  CommandManager.get(GetUserDataCommand).execute(user_id);
	if (result.success)
		return reply.status(200).send(result.data!);
	else
		return reply.status(404).send();
})

/*
	change username
*/
server.put("/user/username", {preHandler : onUserSeen}, async (request, reply) => {
	const user_id = request.sender_id!;
	const username = (request.body as Params).username;
	const result =  CommandManager.get(EditUsernameCommand).execute(user_id, username);
	if(result.success)
		return reply.status(204).send();
	else
		return reply.status(404).send();

})

server.delete("/user/", {preHandler : onUserSeen} ,async (request, reply) => {
	const user_id = request.sender_id!;
	const result =  CommandManager.get(RemoveUserCommand).execute(user_id);
	if(result.success)
		return reply.status(204).send();
});

/*	TODO:
	improve reply management 
		adding specific errors (ex: differencing failure due to user not existant and params, etc..) 
		could do a more generic reply manager too which will deduce the return status based on commandresult content
*/