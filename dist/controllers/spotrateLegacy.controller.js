"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDataController = exports.getServerController = exports.createCommodity = exports.getSpotRate = exports.getCommodityController = exports.updateSpread = exports.deleteSpotRateCommodity = exports.updateCommodity = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const SpotRate_1 = __importDefault(require("../models/SpotRate"));
const commodityFields = [
    'metal',
    'purity',
    'unit',
    'weight',
    'buyPremium',
    'sellPremium',
    'buyCharge',
    'sellCharge',
    'metal_name',
    'group',
];
const sanitizeCommodityData = (commodity = {}) => commodityFields.reduce((sanitizedData, field) => {
    if (Object.prototype.hasOwnProperty.call(commodity, field)) {
        sanitizedData[field] = commodity[field];
    }
    return sanitizedData;
}, {});
const defaultCommodities = [
    { symbol: 'Gold', enabled: true },
    { symbol: 'Silver', enabled: true },
    { symbol: 'Platinum', enabled: true },
    { symbol: 'Copper', enabled: true },
];
const updateCommodity = async (req, res, next) => {
    try {
        const adminId = req.params.adminId;
        const commodityId = req.params.commodityId;
        const commodity = req.body;
        const updatedSpotRate = await SpotRate_1.default.findOneAndUpdate({
            createdBy: new mongoose_1.default.Types.ObjectId(adminId),
            'commodities._id': new mongoose_1.default.Types.ObjectId(commodityId),
        }, {
            $set: {
                'commodities.$': {
                    metal: commodity.metal,
                    purity: commodity.purity,
                    unit: commodity.unit,
                    weight: commodity.weight,
                    _id: new mongoose_1.default.Types.ObjectId(commodityId),
                    buyPremium: commodity.buyPremium ?? 0,
                    sellPremium: commodity.sellPremium ?? 0,
                    buyCharge: commodity.buyCharge ?? 0,
                    sellCharge: commodity.sellCharge ?? 0,
                    metal_name: commodity.metal_name?.trim() || null,
                    group: commodity.group ?? 'commodity',
                },
            },
        }, { new: true });
        if (!updatedSpotRate) {
            res.status(404).json({ message: 'SpotRate or commodity not found' });
            return;
        }
        res.status(200).json({ message: 'Commodity updated successfully', data: updatedSpotRate });
    }
    catch (error) {
        console.error('Error updating commodity:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateCommodity = updateCommodity;
const deleteSpotRateCommodity = async (req, res, next) => {
    try {
        const adminId = req.params.adminId;
        const commodityId = req.params.commodityId;
        const result = await SpotRate_1.default.updateOne({ createdBy: new mongoose_1.default.Types.ObjectId(adminId) }, { $pull: { commodities: { _id: new mongoose_1.default.Types.ObjectId(commodityId) } } });
        if (result.modifiedCount === 0) {
            res.status(404).json({ message: 'Commodity not found or already deleted' });
            return;
        }
        res.status(200).json({ message: 'Commodity deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting commodity:', error);
        res.status(500).json({ error: 'An error occurred while deleting the commodity' });
    }
};
exports.deleteSpotRateCommodity = deleteSpotRateCommodity;
const updateSpread = async (req, res) => {
    const { adminId, metal, type, value } = req.body;
    try {
        const createdBy = new mongoose_1.default.Types.ObjectId(adminId);
        let spotRate = await SpotRate_1.default.findOne({ createdBy });
        if (!spotRate) {
            spotRate = new SpotRate_1.default({ createdBy });
        }
        let fieldName;
        if (type === 'bid' || type === 'ask') {
            fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Spread`;
        }
        else if (type === 'low' || type === 'high') {
            fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Margin`;
        }
        else {
            res.status(400).json({ message: 'Invalid type specified' });
            return;
        }
        const updateObj = { [fieldName]: value };
        const updatedSpotRate = await SpotRate_1.default.findOneAndUpdate({ createdBy }, { $set: updateObj }, { new: true, upsert: true, runValidators: false });
        if (!updatedSpotRate) {
            res.status(404).json({ message: 'SpotRate not found and could not be created' });
            return;
        }
        res.status(200).json({ message: 'Spread updated successfully', data: updatedSpotRate });
    }
    catch (error) {
        console.error('Error updating spread:', error);
        res.status(500).json({ message: 'Error updating spread' });
    }
};
exports.updateSpread = updateSpread;
const getCommodityController = async (req, res, next) => {
    try {
        const userName = req.params.userName;
        if (!userName) {
            res.status(400).json({ success: false, message: 'userName parameter is required.' });
            return;
        }
        const user = await User_1.default.findOne({ email: userName.toLowerCase() });
        if (!user) {
            res.status(404).json({ success: false, message: 'Admin data not found.' });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                userName: user.email,
                companyName: user.companyName,
                email: user.email,
                commodities: defaultCommodities,
            },
        });
    }
    catch (error) {
        console.error('Error fetching commodity details:', error);
        next(error);
    }
};
exports.getCommodityController = getCommodityController;
const getSpotRate = async (req, res, next) => {
    try {
        const adminId = req.params.adminId;
        const createdBy = new mongoose_1.default.Types.ObjectId(adminId);
        let spotRates = await SpotRate_1.default.findOne({ createdBy });
        if (!spotRates) {
            res.status(204).json({ message: 'Spot rates not found for this user' });
            return;
        }
        let hasCommodityNormalizationChanges = false;
        if (Array.isArray(spotRates.commodities)) {
            spotRates.commodities.forEach((commodity) => {
                if (!commodity.group) {
                    commodity.group = 'commodity';
                    hasCommodityNormalizationChanges = true;
                }
            });
        }
        if (hasCommodityNormalizationChanges) {
            await spotRates.save();
        }
        res.json(spotRates);
    }
    catch (error) {
        console.error('Error fetching spot rates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getSpotRate = getSpotRate;
const createCommodity = async (req, res, next) => {
    try {
        const { adminId, commodity } = req.body;
        const createdBy = new mongoose_1.default.Types.ObjectId(adminId);
        let spotrate = await SpotRate_1.default.findOne({ createdBy });
        if (!spotrate) {
            spotrate = new SpotRate_1.default({ createdBy });
        }
        const normalizedCommodity = {
            ...sanitizeCommodityData(commodity),
            metal_name: commodity.metal_name?.trim() || null,
            group: commodity.group ?? 'commodity',
        };
        spotrate.commodities.push(normalizedCommodity);
        const updatedSpotrate = await spotrate.save();
        res.status(200).json({
            message: 'Commodity created successfully',
            data: updatedSpotrate,
        });
    }
    catch (error) {
        console.error('Error creating commodity:', error);
        res.status(500).json({ message: 'Error creating commodity', error: error.message });
    }
};
exports.createCommodity = createCommodity;
const getServerController = async (req, res, next) => {
    try {
        res.status(200).json({ selectedServerURL: 'https://api.aurify.ae' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getServerController = getServerController;
const getAdminDataController = async (req, res, next) => {
    try {
        const userName = req.params.userName;
        if (!userName) {
            res.status(400).json({ success: false, message: 'userName parameter is required.' });
            return;
        }
        const user = await User_1.default.findOne({ email: userName.toLowerCase() });
        if (!user) {
            res.status(404).json({ success: false, message: 'Admin data not found.' });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                userName: user.email,
                companyName: user.companyName,
                email: user.email,
                commodities: defaultCommodities,
            },
        });
    }
    catch (error) {
        console.error('Error fetching admin data:', error);
        next(error);
    }
};
exports.getAdminDataController = getAdminDataController;
