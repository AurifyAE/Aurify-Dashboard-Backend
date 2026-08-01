import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const setIoInstance = (io: Server) => {
  ioInstance = io;
  console.log('✅ Socket.io instance reference set in SocketService');
};

export const getIoInstance = (): Server | null => {
  return ioInstance;
};
