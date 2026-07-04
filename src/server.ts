import app from './app';
import dotenv from 'dotenv';
import connectDB from './config/db';
import dns from 'node:dns';
import http from 'http';
import { Server } from 'socket.io';
import { setupScreenTracker } from './sockets/screenTracker.socket';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    await connectDB();

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'https://screen.aurify.ae',
        methods: ['GET', 'POST'],
      },
    });

    setupScreenTracker(io);

    // Start Express Server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
