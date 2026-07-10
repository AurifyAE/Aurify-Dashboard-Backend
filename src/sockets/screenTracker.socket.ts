import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';
import Merchant from '../models/Merchant';

// Map to track active sockets per merchant: merchantId -> Set<socket.id>
const activeViewers = new Map<string, Set<string>>();

export const setupScreenTracker = (io: Server) => {
  // Socket JWT authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token, secret) as {
          id: string;
          email: string;
          role: UserRole;
          companyName: string;
        };
        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
      } catch (err) {
        console.warn('Socket connection authentication failed for socket ID:', socket.id);
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join-merchant-notifications', async ({ merchantId }: { merchantId: string }) => {
      if (!socket.data.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      try {
        const merchant = await Merchant.findOne({ userId: socket.data.userId }).lean();
        if (!merchant || merchant.merchantId !== merchantId) {
          socket.emit('error', { message: 'Unauthorized merchant access' });
          return;
        }

        await socket.join(`merchant:${merchantId}`);
        console.log(`🔐 Socket ${socket.id} securely joined room merchant:${merchantId}`);
      } catch (err) {
        console.error('join-merchant-notifications error:', err);
      }
    });
    socket.on(
      'join-screen',
      async ({ merchantId, screenSlug }: { merchantId: string; screenSlug: string }) => {
        if (!merchantId) return;

        try {
          const merchant = await Merchant.findOne({ merchantId }).lean();
          if (!merchant) return;

          const maxDevices = merchant.maxDevices || 1;
          const currentViewers = activeViewers.get(merchantId) || new Set<string>();

          if (currentViewers.size >= maxDevices) {
            // Reject connection for this screen due to device limit
            socket.emit('device-limit-reached', { maxDevices });
            return;
          }

          // Add socket to active viewers
          currentViewers.add(socket.id);
          activeViewers.set(merchantId, currentViewers);

          socket.data.merchantId = merchantId; // save to socket for disconnect event
          socket.emit('screen-joined', { success: true });
        } catch (err) {
          console.error('join-screen error:', err);
        }
      }
    );

    socket.on('disconnect', () => {
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
