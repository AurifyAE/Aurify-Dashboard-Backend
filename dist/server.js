"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const node_dns_1 = __importDefault(require("node:dns"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const screenTracker_socket_1 = require("./sockets/screenTracker.socket");
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        node_dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
        await (0, db_1.default)();
        const server = http_1.default.createServer(app_1.default);
        const io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'https://screen.aurify.ae',
                methods: ['GET', 'POST'],
            },
        });
        (0, screenTracker_socket_1.setupScreenTracker)(io);
        // Start Express Server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
