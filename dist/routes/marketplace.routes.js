'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const express_1 = require('express');
const marketplace_controller_1 = require('../controllers/marketplace.controller');
const auth_middleware_1 = require('../middlewares/auth.middleware');
const router = (0, express_1.Router)();
router.get('/live/:merchantSlug', marketplace_controller_1.getLiveScreen);
router.get('/live/:merchantSlug/:screenSlug', marketplace_controller_1.getLiveScreen);
router.use(auth_middleware_1.protect);
router.get('/merchant/me', marketplace_controller_1.getMyMerchant);
router.post('/merchant/register', marketplace_controller_1.registerMerchant);
router.patch(
  '/merchant/:merchantId/status',
  (0, auth_middleware_1.requireRole)('super_admin', 'admin'),
  marketplace_controller_1.approveMerchant
);
router.get('/profile', marketplace_controller_1.getProfile);
router.put('/profile', marketplace_controller_1.updateProfile);
router.get('/themes', marketplace_controller_1.listThemes);
router.get('/themes/installed', marketplace_controller_1.listMerchantThemes);
router.post('/themes/:themeId/install', marketplace_controller_1.installTheme);
router.get('/layouts', marketplace_controller_1.listLayouts);
router.put('/layouts', marketplace_controller_1.saveLayout);
router.post('/layouts/:layoutId/publish', marketplace_controller_1.publishLayout);
router.get('/merchant-commodities', marketplace_controller_1.listMerchantCommodities);
router.post('/merchant-commodities', marketplace_controller_1.upsertMerchantCommodity);
router.patch('/merchant-commodities/:id', marketplace_controller_1.upsertMerchantCommodity);
router.get('/news', marketplace_controller_1.listNews);
router.post('/news', marketplace_controller_1.upsertNews);
router.patch('/news/:id', marketplace_controller_1.upsertNews);
exports.default = router;
