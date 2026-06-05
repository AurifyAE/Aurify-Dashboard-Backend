"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSpotRateSettings = exports.getSpotRateSettings = void 0;
const SpotRateSettings_1 = __importDefault(require("../models/SpotRateSettings"));
const defaults = {
    goldBidSpread: 0,
    goldAskSpread: 0.5,
    silverBidSpread: 0,
    silverAskSpread: 0.05,
};
const getSpotRateSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const doc = await SpotRateSettings_1.default.findOne({ userId }).lean();
        const data = doc ?? { userId, ...defaults };
        res.status(200).json({
            success: true,
            data: {
                goldBidSpread: data.goldBidSpread ?? defaults.goldBidSpread,
                goldAskSpread: data.goldAskSpread ?? defaults.goldAskSpread,
                silverBidSpread: data.silverBidSpread ?? defaults.silverBidSpread,
                silverAskSpread: data.silverAskSpread ?? defaults.silverAskSpread,
            },
        });
    }
    catch (err) {
        console.error("getSpotRateSettings:", err);
        res.status(500).json({ success: false, message: "Failed to fetch settings" });
    }
};
exports.getSpotRateSettings = getSpotRateSettings;
const updateSpotRateSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { goldBidSpread, goldAskSpread, silverBidSpread, silverAskSpread } = req.body;
        const update = {};
        if (typeof goldBidSpread === "number")
            update.goldBidSpread = goldBidSpread;
        if (typeof goldAskSpread === "number")
            update.goldAskSpread = goldAskSpread;
        if (typeof silverBidSpread === "number")
            update.silverBidSpread = silverBidSpread;
        if (typeof silverAskSpread === "number")
            update.silverAskSpread = silverAskSpread;
        const doc = await SpotRateSettings_1.default.findOneAndUpdate({ userId }, { $set: update }, { new: true, upsert: true, runValidators: true });
        res.status(200).json({
            success: true,
            data: {
                goldBidSpread: doc.goldBidSpread,
                goldAskSpread: doc.goldAskSpread,
                silverBidSpread: doc.silverBidSpread,
                silverAskSpread: doc.silverAskSpread,
            },
        });
    }
    catch (err) {
        console.error("updateSpotRateSettings:", err);
        res.status(500).json({ success: false, message: "Failed to update settings" });
    }
};
exports.updateSpotRateSettings = updateSpotRateSettings;
