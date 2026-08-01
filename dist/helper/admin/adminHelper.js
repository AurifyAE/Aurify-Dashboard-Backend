"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommodity = void 0;
const User_1 = __importDefault(require("../../models/User"));
const defaultCommodities = [
    { symbol: 'Gold', enabled: true },
    { symbol: 'Silver', enabled: true },
    { symbol: 'Platinum', enabled: true },
    { symbol: 'Copper', enabled: true },
];
const getCommodity = async (userName) => {
    const user = await User_1.default.findOne({ email: userName.toLowerCase() });
    if (!user)
        return null;
    return {
        _id: user._id,
        userName: user.email,
        companyName: user.companyName,
        email: user.email,
        commodities: defaultCommodities,
    };
};
exports.getCommodity = getCommodity;
