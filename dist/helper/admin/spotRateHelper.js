"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetals = void 0;
const User_1 = __importDefault(require("../../models/User"));
const SpotRate_1 = __importDefault(require("../../models/SpotRate"));
const getMetals = async (userName) => {
    const user = await User_1.default.findOne({ email: userName.toLowerCase() });
    if (!user)
        return null;
    const spotRate = await SpotRate_1.default.findOne({ createdBy: user._id });
    if (!spotRate)
        return [];
    return [...new Set(spotRate.commodities.map((c) => c.metal))];
};
exports.getMetals = getMetals;
