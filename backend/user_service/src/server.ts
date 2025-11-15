import Fastify from "fastify"
import { CommandManager } from "./Managers/CommandManager";
import { ManagerRegistry } from "./Managers/ManagerRegistry";
import { avatarPlugin } from "./API/AvatarPlugin";
import { userPlugin } from "./API/UserPlugin";
import { friendPlugin } from "./API/FriendPlugin";
import { ClearCacheCommand } from "./Commands/ClearCacheCommand";

let isInitialized = false;
let clearIntervalHandle: NodeJS.Timeout | null = null;
const server = createServer();

export function initializeApp() {
	if (isInitialized) return;

	const mr = new ManagerRegistry();
	new CommandManager(mr);

	isInitialized = true;
	console.log('✅ App initialized');

	clearIntervalHandle = setInterval(() => {
		CommandManager.get(ClearCacheCommand).execute();

	}, 1 * 60 * 1000);
}

export function createServer() {
	initializeApp();
	const server = Fastify({ logger: false });
	/*
	server.register(fastifyStatic, {
        root: join(__dirname, "../../../frontend"),
        // Ajoutez l'option `setHeaders` pour vous assurer que les fichiers JS sont bien identifiés
        setHeaders: (res, path, stat) => {
            if (path.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            }
        },
        // Assurez-vous que l'option `extensions` ou `decorateReply` n'a rien cassé
    });*/

	server.register(userPlugin);
	server.register(friendPlugin);
	server.register(avatarPlugin);

	server.addHook('onReady', () => {
		console.log('Server ready');
	});

	return server;
}

async function gracefulShutdown(server: any) {
	console.log("\n🛑 Shutting down server...");

	if (clearIntervalHandle) {
		clearInterval(clearIntervalHandle);
		clearIntervalHandle = null;
		console.log("🧹 Cleared interval");
	}

	CommandManager.get(ClearCacheCommand).execute();

	try {
		await server.close();
		console.log("✅ Fastify server closed");
	} catch (err) {
		console.error("⚠️ Error closing Fastify server:", err);
	}

	process.exit(0);
}

server.listen({ port: 3002, host: "0.0.0.0" })
	.then(() => console.log("✅ Serveur prêt sur http://localhost:3000"))
	.catch(console.error);

process.on("SIGINT", () => gracefulShutdown(server));
process.on("SIGTERM", () => gracefulShutdown(server));