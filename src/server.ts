import app from "./app";
import dotenv from "dotenv";
import connectDB from "./config/db";
import dns from 'node:dns';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        await connectDB();

        // Start Express Server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
