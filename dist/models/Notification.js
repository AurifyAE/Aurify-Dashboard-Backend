'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
const mongoose_1 = __importStar(require('mongoose'));
const NotificationSchema = new mongoose_1.Schema(
  {
    merchantId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['SUCCESS', 'INFO', 'WARNING', 'ERROR'], default: 'INFO' },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'], default: 'NORMAL' },
    category: {
      type: String,
      enum: ['APPROVAL', 'ADMIN', 'SYSTEM', 'FEATURE', 'SECURITY', 'BILLING', 'WARNING'],
      default: 'SYSTEM',
    },
    sourceModule: {
      type: String,
      enum: ['MARKETPLACE', 'SCREEN_BUILDER', 'THEME', 'BILLING', 'ADMIN', 'AUTH', 'ANALYTICS'],
      required: true,
    },
    version: { type: Number, default: 1 },
    silent: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    iconKey: { type: String },
    actor: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, enum: ['admin', 'system', 'user'], default: 'system' },
    },
    actions: [
      {
        label: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    delivery: {
      dashboard: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },
    readAt: { type: Date, default: null },
    clearedAt: { type: Date, default: null },
    expiresAt: { type: Date },
    scheduledFor: { type: Date },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
  },
  { timestamps: true }
);
// Indexes for fast lookup of active notifications per merchant
NotificationSchema.index({ merchantId: 1, clearedAt: 1, createdAt: -1 });
NotificationSchema.index({ merchantId: 1, readAt: 1, clearedAt: 1 });
const Notification = mongoose_1.default.model('Notification', NotificationSchema);
exports.default = Notification;
