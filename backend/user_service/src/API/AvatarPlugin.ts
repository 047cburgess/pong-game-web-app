import fastifyStatic from "@fastify/static";
import path from "path";
import { FastifyInstance } from "fastify";
import { onUserSeen } from "./preHandler";
import { CommandManager } from "../Managers/CommandManager";
import { UploadAvatarCommand } from "../Commands/UploadAvatarCommand";
import fastifyMultipart from "@fastify/multipart";

export async function avatarPlugin(server: FastifyInstance) {
	const AVATAR_DIR = path.join(process.cwd(), "data/avatars");
	const DEFAULT_AVATAR = path.join(process.cwd(), "data/avatars/default.webp");

	server.register(fastifyStatic, {
		root: AVATAR_DIR,
		prefix: "/user/avatars/",
		decorateReply: false,
	});

	server.setNotFoundHandler(async (req, reply) => {
		if (req.raw.url?.startsWith("/user/avatars/")) {
			return reply.status(200).sendFile("default.webp", AVATAR_DIR);
		}
		reply.status(404).send({ error: "Not Found" });
	});

	server.register(fastifyMultipart, {
		limits: {
			fileSize: 2 * 1024 * 1024, // 2 MB en octets
		},
	});

	server.post("/user/avatar", { preHandler: onUserSeen }, async (request, reply) => {
		const user_id = request.sender_id;

		try {
			const mpFile = await request.file();

			if (!mpFile) {
				return reply.status(400).send("NO_FILE_RECEIVED");
			}
			const buffer = await mpFile.toBuffer();
			await CommandManager.get(UploadAvatarCommand).execute(user_id!, { buffer: buffer, mimetype: mpFile.mimetype });
			return reply.status(204).send();
		} catch (err: any) {
			if (err.code === "FST_FILES_LIMIT" || err.message.includes("File too large")) {
				return reply.status(413).send("FILE_TOO_LARGE");
			}

			console.error("[/user/avatar] upload error:", err);
			return reply.status(500).send(err.message);
		}
	});
}
