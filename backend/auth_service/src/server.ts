import fastify from "fastify";
import cors from '@fastify/cors';
import { apiGateway } from "./Api/ApiGateway";
import { AuthPlugin } from "./Api/AuthPuglin";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import path from "path";
import dotenv from 'dotenv';

let isInitialized = false;
let clearIntervalHandle: NodeJS.Timeout | null = null;
const server = createServer();

// Added for cors
server.register(cors, {
	origin: (_origin, cb) => {
		cb(null, true);
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
});

export function initializeApp() {
	if (isInitialized) return;
	dotenv.config();
	isInitialized = true;
	console.log('✅ App initialized');

}

export function createServer() {
	initializeApp();
	const server = fastify({
		logger: {
			level: 'debug',
    			transport: {
    			    target: 'pino-pretty',
    			    options: {
    			      translateTime: "SYS:HH:MM:ss Z",
    			      ignore: 'pid,hostname',
    			      colorize: true
			    }
    			}
		}
	});

	server.register(fastifyStatic, {
        root: path.join(process.cwd(), "../../frontend"),
        // Ajoutez l'option `setHeaders` pour vous assurer que les fichiers JS sont bien identifiés
        setHeaders: (res, path, stat) => {
            if (path.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            }
        },
        // Assurez-vous que l'option `extensions` ou `decorateReply` n'a rien cassé
    });

	server.register(fastifyCookie);

	server.register(AuthPlugin);
	server.register(apiGateway);

	
	server.addHook('onReady', () => {
		server.log.info('Server ready');
	});

	return server;
}

async function gracefulShutdown(server: any) {
	server.log.info("\n🛑 Shutting down server...");

	try {
		await server.close();
		server.log.info("✅ Fastify server closed");
	} catch (err) {
		server.log.error("⚠️ Error closing Fastify server:", err);
	}

	process.exit(0);
}

server.listen({ port: 3000, host: "0.0.0.0" })
	.then(() => server.log.info("✅ Serveur prêt sur http://localhost:3000"))
	.catch(console.error);

process.on("SIGINT", () => gracefulShutdown(server));
process.on("SIGTERM", () => gracefulShutdown(server));
