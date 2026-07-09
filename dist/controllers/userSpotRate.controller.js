"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserCommodity = exports.createCommodity = exports.deleteUserCommodity = exports.addUserCommodity = exports.updateUserSpread = exports.getUserCommodity = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const UserSpotRate_1 = require("../models/UserSpotRate");
const commodityFields = [
    '_id',
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
const sanitizeCommodityData = (commodityData = {}) => commodityFields.reduce((sanitizedData, field) => {
    if (Object.prototype.hasOwnProperty.call(commodityData, field)) {
        sanitizedData[field] = commodityData[field];
    }
    return sanitizedData;
}, {});
const getUserCommodity = async (req, res, next) => {
    try {
        const adminId = req.params.adminId;
        const categoryId = req.params.categoryId;
        const userSpotRate = await UserSpotRate_1.UserSpotRateModel.findOne({
            createdBy: new mongoose_1.default.Types.ObjectId(adminId),
        });
        if (!userSpotRate) {
            return res.status(204).json({ message: 'User spot rate not found' });
        }
        const category = userSpotRate.categories.find((cat) => cat.categoryId === categoryId);
        if (!category) {
            return res.status(204).json({ message: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        console.error('Error fetching spot rates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUserCommodity = getUserCommodity;
const updateUserSpread = async (req, res) => {
    try {
        const { adminId, categoryId, metal, type, value } = req.body;
        let userSpotRate = await UserSpotRate_1.UserSpotRateModel.findOne({
            createdBy: new mongoose_1.default.Types.ObjectId(adminId),
        });
        if (!userSpotRate) {
            // Create a new UserSpotRate if it doesn't exist
            userSpotRate = new UserSpotRate_1.UserSpotRateModel({
                createdBy: new mongoose_1.default.Types.ObjectId(adminId),
                categories: [{ categoryId, commodities: [] }],
            });
        }
        let category = userSpotRate.categories.find((cat) => cat.categoryId === categoryId);
        if (!category) {
            // Add a new category if it doesn't exist
            category = { categoryId, commodities: [] };
            userSpotRate.categories.push(category);
        }
        const field = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}${type === 'low' || type === 'high' ? 'Margin' : 'Spread'}`;
        category[field] = value;
        userSpotRate.markModified('categories');
        await userSpotRate.save();
        res.json({ message: 'Spread updated successfully', data: category });
    }
    catch (error) {
        console.error('Error updating spread:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateUserSpread = updateUserSpread;
const addUserCommodity = async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const categoryId = req.params.categoryId;
        let commodityData = req.body.commodity || req.body;
        let userSpotRate = await UserSpotRate_1.UserSpotRateModel.findOne({
            createdBy: new mongoose_1.default.Types.ObjectId(adminId),
        });
        if (!userSpotRate) {
            userSpotRate = new UserSpotRate_1.UserSpotRateModel({
                createdBy: new mongoose_1.default.Types.ObjectId(adminId),
                categories: [],
            });
        }
        let category = userSpotRate.categories.find((cat) => cat.categoryId.toString() === categoryId);
        if (!category) {
            const newCategory = { categoryId, commodities: [] };
            userSpotRate.categories.push(newCategory);
        }
        category = userSpotRate.categories.find((cat) => cat.categoryId.toString() === categoryId);
        if (!category) {
            return res.status(500).json({ message: 'Category not resolved' });
        }
        // Ensure the commodities array exists
        if (!category.commodities) {
            category.commodities = [];
        }
        // Ensure all required fields are present
        const requiredFields = ['metal', 'purity', 'unit', 'weight'];
        const optionalFields = ['buyPremium', 'sellPremium', 'buyCharge', 'sellCharge'];
        const missingRequiredFields = requiredFields.filter((field) => {
            const value = commodityData[field];
            return value === undefined || value === null || value === '';
        });
        if (missingRequiredFields.length > 0) {
            return res.status(400).json({
                message: `Missing or empty required fields: ${missingRequiredFields.join(', ')}`,
                receivedData: commodityData,
            });
        }
        // Set default values for optional fields if not provided
        optionalFields.forEach((field) => {
            if (commodityData[field] === undefined) {
                commodityData[field] = 0;
            }
        });
        commodityData = sanitizeCommodityData(commodityData);
        commodityData.metal_name = commodityData.metal_name ?? null;
        commodityData.group = commodityData.group ?? 'commodity';
        if (commodityData._id) {
            // Update existing commodity
            const commodityIndex = category.commodities.findIndex((c) => c._id.toString() === commodityData._id);
            if (commodityIndex !== -1) {
                category.commodities[commodityIndex] = {
                    ...category.commodities[commodityIndex],
                    ...commodityData,
                };
            }
            else {
                return res.status(404).json({ message: 'Commodity not found' });
            }
        }
        else {
            // Add new commodity
            commodityData._id = new mongoose_1.default.Types.ObjectId();
            category.commodities.push(commodityData);
        }
        // Save the updated or new user spot rate
        userSpotRate.markModified('categories');
        await userSpotRate.save();
        res.json({
            message: 'Commodity added/updated successfully',
            data: category,
            addedCommodity: commodityData,
        });
    }
    catch (error) {
        console.error('Error adding/updating commodity:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message,
            stack: error.stack,
        });
    }
};
exports.addUserCommodity = addUserCommodity;
const deleteUserCommodity = async (req, res, next) => {
    try {
        const adminId = req.params.adminId;
        const categoryId = req.params.categoryId;
        const commodityId = req.params.commodityId;
        const userSpotRate = await UserSpotRate_1.UserSpotRateModel.findOne({
            createdBy: new mongoose_1.default.Types.ObjectId(adminId),
        });
        if (!userSpotRate) {
            return res.status(404).json({ message: 'User spot rate not found' });
        }
        const category = userSpotRate.categories.find((cat) => cat.categoryId === categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        category.commodities = category.commodities.filter((c) => c._id.toString() !== commodityId);
        userSpotRate.markModified('categories');
        await userSpotRate.save();
        res.json({ message: 'Commodity deleted successfully', data: category });
    }
    catch (error) {
        console.error('Error deleting commodity:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteUserCommodity = deleteUserCommodity;
const createCommodity = async (req, res, next) => {
    try {
        const { adminId, categoryId, commodity } = req.body;
        const createdBy = new mongoose_1.default.Types.ObjectId(adminId);
        const updatedUserSpotRate = await UserSpotRate_1.UserSpotRateModel.findOneAndUpdate({
            'categories.categoryId': categoryId,
            'categories.categoryData.createdBy': createdBy,
        }, {
            $push: {
                'categories.$[outer].categoryData.commodities': commodity,
            },
        }, {
            arrayFilters: [{ 'outer.categoryId': categoryId }],
            new: true,
            upsert: true,
        });
        if (!updatedUserSpotRate) {
            return res.status(404).json({ message: 'UserSpotRate not found and could not be created' });
        }
        res.status(200).json({
            message: 'Commodity created successfully',
            data: updatedUserSpotRate,
        });
    }
    catch (error) {
        console.error('Error creating commodity:', error);
        res.status(500).json({ message: 'Error creating commodity', error: error.message });
    }
};
exports.createCommodity = createCommodity;
const updateUserCommodity = async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const categoryId = req.params.categoryId;
        const commodityId = req.params.commodityId;
        const updatedCommodityData = req.body;
        // Validate input
        if (!mongoose_1.default.Types.ObjectId.isValid(adminId) ||
            !mongoose_1.default.Types.ObjectId.isValid(commodityId)) {
            return res.status(400).json({ message: 'Invalid adminId or commodityId' });
        }
        // Find the UserSpotRate document
        const userSpotRate = await UserSpotRate_1.UserSpotRateModel.findOne({
            createdBy: new mongoose_1.default.Types.ObjectId(adminId),
        });
        if (!userSpotRate) {
            return res.status(404).json({ message: 'User spot rate not found' });
        }
        // Find the category
        const category = userSpotRate.categories.find((cat) => cat.categoryId === categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        // Find the commodity
        const commodityIndex = category.commodities.findIndex((c) => c._id.toString() === commodityId);
        if (commodityIndex === -1) {
            return res.status(404).json({ message: 'Commodity not found' });
        }
        const patch = sanitizeCommodityData(updatedCommodityData);
        if (Object.prototype.hasOwnProperty.call(patch, 'metal_name')) {
            patch.metal_name = patch.metal_name ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'group')) {
            patch.group = patch.group ?? 'commodity';
        }
        // Update the commodity
        Object.assign(category.commodities[commodityIndex], patch);
        // Save the changes
        userSpotRate.markModified('categories');
        await userSpotRate.save();
        res.json({
            message: 'Commodity updated successfully',
            data: category.commodities[commodityIndex],
        });
    }
    catch (error) {
        console.error('Error updating commodity:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.updateUserCommodity = updateUserCommodity;
