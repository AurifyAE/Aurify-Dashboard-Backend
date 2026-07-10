'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.setupScreenTracker = void 0;
const Merchant_1 = __importDefault(require('../models/Merchant'));
// Map to track active sockets per merchant: merchantId -> Set<socket.id>
const activeViewers = new Map();
const setupScreenTracker = (io) => {
  io.on('connection', (socket) => {
    socket.on('join-screen', async ({ merchantId, screenSlug }) => {
      if (!merchantId) return;
      try {
        const merchant = await Merchant_1.default.findOne({ merchantId }).lean();
        if (!merchant) return;
        const maxDevices = merchant.maxDevices || 1;
        const currentViewers = activeViewers.get(merchantId) || new Set();
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
    });
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
exports.setupScreenTracker = setupScreenTracker;
