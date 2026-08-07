'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getIoInstance = exports.setIoInstance = void 0;
let ioInstance = null;
const setIoInstance = (io) => {
  ioInstance = io;
  console.log('✅ Socket.io instance reference set in SocketService');
};
exports.setIoInstance = setIoInstance;
const getIoInstance = () => {
  return ioInstance;
};
exports.getIoInstance = getIoInstance;
