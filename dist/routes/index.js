"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const spotrate_routes_1 = __importDefault(require("./spotrate.routes"));
const templates_routes_1 = __importDefault(require("./templates.routes"));
const marketplace_routes_1 = __importDefault(require("./marketplace.routes"));
const spotrateLegacy_routes_1 = __importDefault(require("./spotrateLegacy.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.status(200).json({ message: 'API Working Fine ✅' });
});
router.use('/auth', auth_routes_1.default);
router.use('/spotrate', spotrate_routes_1.default);
router.use('/templates', templates_routes_1.default);
router.use('/marketplace', marketplace_routes_1.default);
router.use('/admin', admin_routes_1.default);
router.use('/', spotrateLegacy_routes_1.default);
exports.default = router;
