"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApp = initializeApp;
exports.createServer = createServer;
const fastify_1 = __importDefault(require("fastify"));
const ApiGateway_1 = require("./Api/ApiGateway");
const AuthPuglin_1 = require("./Api/AuthPuglin");
let isInitialized = false;
let clearIntervalHandle = null;
const server = createServer();
function initializeApp() {
    if (isInitialized)
        return;
    isInitialized = true;
    console.log('✅ App initialized');
}
function createServer() {
    initializeApp();
    const server = (0, fastify_1.default)({
        logger: {
            level: 'info', // or 'debug' for verbose
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: "HH:MM:ss Z 'Europe/Paris'",
                    ignore: 'pid,hostname',
                    colorize: true
                }
            }
        }
    });
    server.register(AuthPuglin_1.AuthPlugin);
    server.register(ApiGateway_1.apiGateway);
    server.addHook('onReady', () => {
        server.log.info('Server ready');
    });
    return server;
}
async function gracefulShutdown(server) {
    server.log.info("\n🛑 Shutting down server...");
    try {
        await server.close();
        server.log.info("✅ Fastify server closed");
    }
    catch (err) {
        server.log.error("⚠️ Error closing Fastify server:", err);
    }
    process.exit(0);
}
server.listen({ port: 3000, host: "0.0.0.0" })
    .then(() => server.log.info("✅ Serveur prêt sur http://localhost:3000"))
    .catch(console.error);
process.on("SIGINT", () => gracefulShutdown(server));
process.on("SIGTERM", () => gracefulShutdown(server));
