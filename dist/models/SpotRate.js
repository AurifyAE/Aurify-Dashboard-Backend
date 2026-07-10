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
const CommoditySchema = new mongoose_1.Schema({
  metal: { type: String },
  purity: { type: Number, default: 0 },
  unit: { type: Number, default: 0 },
  weight: { type: String },
  buyPremium: { type: Number, default: 0 },
  sellPremium: { type: Number, default: 0 },
  buyCharge: { type: Number, default: 0 },
  sellCharge: { type: Number, default: 0 },
  metal_name: { type: String, default: null },
  group: { type: String, default: 'commodity' },
});
const SpotRateSchema = new mongoose_1.Schema({
  createdBy: {
    type: mongoose_1.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true,
  },
  silverAskSpread: { type: Number, default: 0 },
  silverBidSpread: { type: Number, default: 0 },
  goldAskSpread: { type: Number, default: 0 },
  goldBidSpread: { type: Number, default: 0 },
  copperAskSpread: { type: Number, default: 0 },
  copperBidSpread: { type: Number, default: 0 },
  platinumAskSpread: { type: Number, default: 0 },
  platinumBidSpread: { type: Number, default: 0 },
  goldLowMargin: { type: Number, default: 0 },
  goldHighMargin: { type: Number, default: 0 },
  silverLowMargin: { type: Number, default: 0 },
  silverHighMargin: { type: Number, default: 0 },
  copperLowMargin: { type: Number, default: 0 },
  copperHighMargin: { type: Number, default: 0 },
  platinumLowMargin: { type: Number, default: 0 },
  platinumHighMargin: { type: Number, default: 0 },
  commodities: [CommoditySchema],
});
const SpotRate = mongoose_1.default.model('SpotRate', SpotRateSchema);
exports.default = SpotRate;
