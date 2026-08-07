'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const express_1 = require('express');
const spotrateLegacy_controller_1 = require('../controllers/spotrateLegacy.controller');
const auth_middleware_1 = require('../middlewares/auth.middleware');
const router = (0, express_1.Router)();
// Protect all routes (as they are called from the authenticated dashboard)
router.use(auth_middleware_1.protect);
router.post('/update-spread', spotrateLegacy_controller_1.updateSpread);
router.get('/spotrates/:adminId', spotrateLegacy_controller_1.getSpotRate);
router.get('/commodities/:userName', spotrateLegacy_controller_1.getCommodityController);
router.post('/spotrate-commodity', spotrateLegacy_controller_1.createCommodity);
router.patch(
  '/spotrate-commodity/:adminId/:commodityId',
  spotrateLegacy_controller_1.updateCommodity
);
router.delete(
  '/commodities/:adminId/:commodityId',
  spotrateLegacy_controller_1.deleteSpotRateCommodity
);
router.get('/server-url', spotrateLegacy_controller_1.getServerController);
router.get('/data/:userName', spotrateLegacy_controller_1.getAdminDataController);
exports.default = router;
