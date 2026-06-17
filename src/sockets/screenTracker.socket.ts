import { Server, Socket } from "socket.io";
import Merchant from "../models/Merchant";

// Map to track active sockets per merchant: merchantId -> Set<socket.id>
const activeViewers = new Map<string, Set<string>>();

export const setupScreenTracker = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    
    socket.on("join-screen", async ({ merchantId, screenSlug }: { merchantId: string, screenSlug: string }) => {
      if (!merchantId) return;

      try {
        const merchant = await Merchant.findOne({ merchantId }).lean();
        if (!merchant) return;

        const maxDevices = merchant.maxDevices || 1;
        const currentViewers = activeViewers.get(merchantId) || new Set<string>();

        if (currentViewers.size >= maxDevices) {
          // Reject connection for this screen due to device limit
          socket.emit("device-limit-reached", { maxDevices });
          return;
        }

        // Add socket to active viewers
        currentViewers.add(socket.id);
        activeViewers.set(merchantId, currentViewers);
        
        socket.data.merchantId = merchantId; // save to socket for disconnect event
        socket.emit("screen-joined", { success: true });
        
      } catch (err) {
        console.error("join-screen error:", err);
      }
    });

    socket.on("disconnect", () => {
      const merchantId = socket.data.merchantId;
      if (merchantId) {
        const currentViewers = activeViewers.get(merchantId);
        if (currentViewers) {
          currentViewers.delete(socket.id);
          if (currentViewers.size === 0) {
            activeViewers.delete(merchantId);
          } else {
            activeViewers.set(merchantId, currentViewers);
          }
        }
      }
    });
  });
};
