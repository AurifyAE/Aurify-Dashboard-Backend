"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetalCommodity = exports.createCommodity = exports.getSpotRate = exports.getCommodityController = exports.updateSpread = exports.deleteSpotRateCommodity = exports.updateCommodity = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const spotRateHelper_1 = require("../helper/admin/spotRateHelper");
const adminHelper_1 = require("../helper/admin/adminHelper");
const SpotRate_1 = __importDefault(require("../models/SpotRate"));
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
const createAppError = (message, statusCode) => {
    return new AppError(message, statusCode);
};
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
                    buyPremium: commodity.buyPremium,
                    sellPremium: commodity.sellPremium,
                    buyCharge: commodity.buyCharge,
                    sellCharge: commodity.sellCharge,
                    metal_name: commodity.metal_name?.trim() || null,
                    group: commodity.group ?? 'group1',
                },
            },
        }, { new: true });
        if (!updatedSpotRate) {
            return res.status(404).json({ message: 'SpotRate or commodity not found' });
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
            return res.status(404).json({ message: 'Commodity not found or already deleted' });
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
            spotRate = new SpotRate_1.default({
                createdBy,
            });
        }
        let fieldName;
        if (type === 'bid' || type === 'ask') {
            fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Spread`;
        }
        else if (type === 'low' || type === 'high') {
            fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Margin`;
        }
        else {
            return res.status(400).json({ message: 'Invalid type specified' });
        }
        const updateObj = { [fieldName]: value };
        const updatedSpotRate = await SpotRate_1.default.findOneAndUpdate({ createdBy }, { $set: updateObj }, { new: true, upsert: true, runValidators: false });
        if (!updatedSpotRate) {
            return res.status(404).json({ message: 'SpotRate not found and could not be created' });
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
            throw createAppError('userName parameter is required.', 400);
        }
        const commodityData = await (0, adminHelper_1.getCommodity)(userName);
        if (!commodityData) {
            throw createAppError('Admin data not found.', 404);
        }
        res.status(200).json({
            success: true,
            data: commodityData,
        });
    }
    catch (error) {
        console.log('Error:', error.message);
        next(error);
    }
};
exports.getCommodityController = getCommodityController;
const getSpotRate = async (req, res, next) => {
    try {
        const adminId = req.params.adminId;
        const createdBy = new mongoose_1.default.Types.ObjectId(adminId);
        const spotRates = await SpotRate_1.default.findOne({ createdBy });
        if (!spotRates) {
            return res.status(204).json({ message: 'Spot rates not found for this user' });
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
            spotrate = new SpotRate_1.default({
                createdBy,
            });
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
const getMetalCommodity = async (req, res, next) => {
    try {
        const userName = req.params.userName;
        if (!userName) {
            throw createAppError('Id is required.', 400);
        }
        const metalData = await (0, spotRateHelper_1.getMetals)(userName);
        if (!metalData) {
            throw createAppError('Metal data not found.', 404);
        }
        res.status(200).json({
            success: true,
            data: metalData,
        });
    }
    catch (error) {
        console.log('Error:', error.message);
        next(error);
    }
};
exports.getMetalCommodity = getMetalCommodity;
