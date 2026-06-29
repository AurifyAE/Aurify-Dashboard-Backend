'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.getLiveScreen =
  exports.upsertNews =
  exports.listNews =
  exports.upsertMerchantCommodity =
  exports.listMerchantCommodities =
  exports.publishLayout =
  exports.saveLayout =
  exports.listLayouts =
  exports.listMerchantThemes =
  exports.installTheme =
  exports.listThemes =
  exports.getProfile =
  exports.updateProfile =
  exports.approveMerchant =
  exports.registerMerchant =
  exports.getMyMerchant =
    void 0;
const mongoose_1 = __importDefault(require('mongoose'));
const Merchant_1 = __importDefault(require('../models/Merchant'));
const MerchantProfile_1 = __importDefault(require('../models/MerchantProfile'));
const MarketplaceTheme_1 = __importDefault(require('../models/MarketplaceTheme'));
const MerchantTheme_1 = __importDefault(require('../models/MerchantTheme'));
const ScreenLayout_1 = __importDefault(require('../models/ScreenLayout'));
const MerchantCommodity_1 = __importDefault(require('../models/MerchantCommodity'));
const MerchantNews_1 = __importDefault(require('../models/MerchantNews'));
const PublishedScreen_1 = require('../models/PublishedScreen');
const SpotRateSettings_1 = __importDefault(require('../models/SpotRateSettings'));
const SCREEN_BASE_URL = process.env.SCREEN_BASE_URL || 'https://screen.aurify.ae';
const THEME_SEEDS = [
  {
    name: 'Royal Bullion',
    category: 'Luxury Gold',
    widgets: ['Spot Rates', 'Commodity Table', 'News', 'Clock', 'London Fix'],
    colors: { primary: '#d4a017', secondary: '#121826', accent: '#f8fafc' },
    fonts: ['Cinzel', 'Inter'],
  },
  {
    name: 'Midnight Exchange',
    category: 'Modern Dark',
    widgets: ['Spot Rates', 'Commodity Table', 'News', 'Currency Rates'],
    colors: { primary: '#38bdf8', secondary: '#0f172a', accent: '#22c55e' },
    fonts: ['Inter', 'Roboto Mono'],
  },
  {
    name: 'Executive Rate Board',
    category: 'Corporate',
    widgets: ['Spot Rates', 'Commodity Table', 'Date', 'Contact Information'],
    colors: { primary: '#2563eb', secondary: '#ffffff', accent: '#111827' },
    fonts: ['Inter', 'DM Sans'],
  },
  {
    name: 'Jewellery Showcase',
    category: 'Jewellery Premium',
    widgets: ['Image Banner', 'Commodity Table', 'News', 'Social Links'],
    colors: { primary: '#be185d', secondary: '#18181b', accent: '#facc15' },
    fonts: ['Playfair Display', 'Poppins'],
  },
  {
    name: 'Majlis Premium',
    category: 'Arabic Premium',
    widgets: ['Spot Rates', 'Commodity Table', 'Clock', 'QR Code'],
    colors: { primary: '#16a34a', secondary: '#111827', accent: '#d4a017' },
    fonts: ['Cairo', 'Inter'],
  },
];
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
const merchantIdFromUser = (userId) => `m_${userId}`;
const getUserMerchant = async (req) => {
  if (!req.user?.id) throw new Error('Unauthorized');
  const merchant = await Merchant_1.default.findOne({ userId: req.user.id });
  return merchant;
};
const ensureMarketplaceThemes = async () => {
  const count = await MarketplaceTheme_1.default.countDocuments();
  if (count > 0) return;
  await MarketplaceTheme_1.default.insertMany(THEME_SEEDS);
};
const getMyMerchant = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    res.status(200).json({ success: true, data: merchant });
  } catch (err) {
    console.error('getMyMerchant:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch merchant' });
  }
};
exports.getMyMerchant = getMyMerchant;
const registerMerchant = async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const existing = await Merchant_1.default.findOne({ userId: req.user.id });
    if (existing) {
      res
        .status(200)
        .json({ success: true, data: existing, message: 'Merchant already registered' });
      return;
    }
    const companyName = String(req.body.companyName || req.user.companyName || '').trim();
    const email = String(req.body.email || req.user.email || '')
      .trim()
      .toLowerCase();
    if (!companyName || !email) {
      res.status(400).json({ success: false, message: 'companyName and email are required' });
      return;
    }
    const baseSlug = slugify(req.body.slug || companyName);
    let slug = baseSlug || `merchant-${Date.now()}`;
    let suffix = 1;
    while (await Merchant_1.default.exists({ slug })) {
      slug = `${baseSlug}-${suffix++}`;
    }
    const merchant = await Merchant_1.default.create({
      merchantId: merchantIdFromUser(req.user.id),
      userId: req.user.id,
      companyName,
      slug,
      logo: req.body.companyLogo || req.body.logo,
      businessType: req.body.businessType,
      country: req.body.country,
      city: req.body.city,
      address: req.body.address,
      website: req.body.website,
      email,
      phone: req.body.phone,
      whatsapp: req.body.whatsapp,
      status: 'Pending',
      services: req.body.services,
      branding: req.body.branding,
      visibility: req.body.visibility,
      packageId: req.body.packageId,
    });
    await MerchantProfile_1.default.create({
      merchantId: merchant.merchantId,
      website: merchant.website,
      address: merchant.address,
    });
    res.status(201).json({ success: true, data: merchant });
  } catch (err) {
    console.error('registerMerchant:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to register merchant' });
  }
};
exports.registerMerchant = registerMerchant;
const approveMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { status } = req.body;
    if (!['Pending', 'Active', 'Suspended'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid merchant status' });
      return;
    }
    const merchant = await Merchant_1.default.findOneAndUpdate(
      { merchantId },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }
    res.status(200).json({ success: true, data: merchant });
  } catch (err) {
    console.error('approveMerchant:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};
exports.approveMerchant = approveMerchant;
const updateProfile = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const merchantPatch = {};
    [
      'companyName',
      'logo',
      'phone',
      'whatsapp',
      'website',
      'address',
      'branding',
      'visibility',
    ].forEach((key) => {
      if (req.body[key] !== undefined) merchantPatch[key] = req.body[key];
    });
    if (Object.keys(merchantPatch).length) {
      await Merchant_1.default.updateOne(
        { merchantId: merchant.merchantId },
        { $set: merchantPatch },
        { runValidators: true }
      );
    }
    const profile = await MerchantProfile_1.default.findOneAndUpdate(
      { merchantId: merchant.merchantId },
      {
        $set: {
          banner: req.body.banner,
          about: req.body.about,
          website: req.body.website,
          address: req.body.address,
          branches: req.body.branches,
          socialLinks: req.body.socialLinks,
          businessHours: req.body.businessHours,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
    const updatedMerchant = await Merchant_1.default.findOne({ merchantId: merchant.merchantId });
    res.status(200).json({ success: true, data: { merchant: updatedMerchant, profile } });
  } catch (err) {
    console.error('updateProfile:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};
exports.updateProfile = updateProfile;
const getProfile = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const profile = await MerchantProfile_1.default
      .findOne({ merchantId: merchant.merchantId })
      .lean();
    res.status(200).json({ success: true, data: { merchant, profile } });
  } catch (err) {
    console.error('getProfile:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};
exports.getProfile = getProfile;
const listThemes = async (_req, res) => {
  try {
    await ensureMarketplaceThemes();
    const themes = await MarketplaceTheme_1.default
      .find({ active: true })
      .sort({ category: 1, name: 1 })
      .lean();
    res.status(200).json({ success: true, data: themes });
  } catch (err) {
    console.error('listThemes:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch themes' });
  }
};
exports.listThemes = listThemes;
const installTheme = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const theme = await MarketplaceTheme_1.default.findById(req.params.themeId).lean();
    if (!theme) {
      res.status(404).json({ success: false, message: 'Theme not found' });
      return;
    }
    const installed = await MerchantTheme_1.default.findOneAndUpdate(
      { merchantId: merchant.merchantId, themeId: theme._id.toString() },
      {
        $setOnInsert: {
          merchantId: merchant.merchantId,
          themeId: theme._id.toString(),
          name: theme.name,
          category: theme.category,
          customizations: { colors: theme.colors, fonts: theme.fonts, widgets: theme.widgets },
          installedAt: new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: installed });
  } catch (err) {
    console.error('installTheme:', err);
    res.status(500).json({ success: false, message: 'Failed to install theme' });
  }
};
exports.installTheme = installTheme;
const listMerchantThemes = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const themes = await MerchantTheme_1.default
      .find({ merchantId: merchant.merchantId })
      .sort({ installedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: themes });
  } catch (err) {
    console.error('listMerchantThemes:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch installed themes' });
  }
};
exports.listMerchantThemes = listMerchantThemes;
const listLayouts = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const layouts = await ScreenLayout_1.default
      .find({ merchantId: merchant.merchantId })
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: layouts });
  } catch (err) {
    console.error('listLayouts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch layouts' });
  }
};
exports.listLayouts = listLayouts;
const saveLayout = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const layoutId =
      req.body.layoutId || `layout_${new mongoose_1.default.Types.ObjectId().toString()}`;
    const screenSlug = slugify(req.body.screenSlug || 'main') || 'main';
    const layout = await ScreenLayout_1.default.findOneAndUpdate(
      { layoutId, merchantId: merchant.merchantId },
      {
        $set: {
          name: req.body.name || 'Main Screen',
          screenSlug,
          themeId: req.body.themeId,
          header: req.body.header || {},
          body: req.body.body || {},
          sidebar: req.body.sidebar || {},
          footer: req.body.footer || {},
          widgets: req.body.widgets || [],
          styles: req.body.styles || {},
          status: 'draft',
        },
        $setOnInsert: { layoutId, merchantId: merchant.merchantId },
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: layout });
  } catch (err) {
    console.error('saveLayout:', err);
    res.status(500).json({ success: false, message: 'Failed to save layout' });
  }
};
exports.saveLayout = saveLayout;
const publishLayout = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    if (merchant.status !== 'Active') {
      res
        .status(400)
        .json({ success: false, message: 'Merchant must be Active before going live' });
      return;
    }
    const layout = await ScreenLayout_1.default
      .findOne({ layoutId: req.params.layoutId, merchantId: merchant.merchantId })
      .lean();
    if (!layout) {
      res.status(404).json({ success: false, message: 'Layout not found' });
      return;
    }
    if (!layout.themeId) {
      res.status(400).json({ success: false, message: 'Theme Selected validation failed' });
      return;
    }
    const installedTheme = await MerchantTheme_1.default
      .findOne({ merchantId: merchant.merchantId, themeId: layout.themeId })
      .lean();
    if (!installedTheme) {
      res.status(400).json({ success: false, message: 'Selected theme is not installed' });
      return;
    }
    const latest = await PublishedScreen_1.PublishedLayoutVersion.findOne({
      merchantId: merchant.merchantId,
      layoutId: layout.layoutId,
    }).sort({ version: -1 });
    const version = (latest?.version || 0) + 1;
    const published = await PublishedScreen_1.PublishedLayoutVersion.create({
      layoutId: layout.layoutId,
      merchantId: merchant.merchantId,
      status: 'published',
      version,
      snapshot: JSON.parse(JSON.stringify(layout)),
    });
    await ScreenLayout_1.default.updateOne(
      { layoutId: layout.layoutId },
      { $set: { status: 'published' } }
    );
    const liveUrl = `${SCREEN_BASE_URL}/${merchant.slug}/${layout.screenSlug}`;
    const screen = await PublishedScreen_1.ScreenRecord.findOneAndUpdate(
      { merchantId: merchant.merchantId, screenSlug: layout.screenSlug },
      {
        $set: {
          layoutId: layout.layoutId,
          themeId: layout.themeId,
          live: true,
          liveUrl,
          assignedDevices: req.body.assignedDevices || [],
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
    console.log('screenUpdated', {
      merchantId: merchant.merchantId,
      screenId: screen._id.toString(),
    });
    res.status(200).json({ success: true, data: { published, screen, liveUrl } });
  } catch (err) {
    console.error('publishLayout:', err);
    res.status(500).json({ success: false, message: 'Failed to publish layout' });
  }
};
exports.publishLayout = publishLayout;
const listMerchantCommodities = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const commodities = await MerchantCommodity_1.default
      .find({ merchantId: merchant.merchantId })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: commodities });
  } catch (err) {
    console.error('listMerchantCommodities:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch merchant commodities' });
  }
};
exports.listMerchantCommodities = listMerchantCommodities;
const upsertMerchantCommodity = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const payload = {
      name: req.body.name,
      metal: req.body.metal,
      purity: req.body.purity,
      weight: Number(req.body.weight) || 0,
      unit: req.body.unit,
      buyPremium: Number(req.body.buyPremium) || 0,
      sellPremium: Number(req.body.sellPremium) || 0,
      buyCharge: Number(req.body.buyCharge) || 0,
      sellCharge: Number(req.body.sellCharge) || 0,
      image: req.body.image,
      active: req.body.active ?? true,
    };
    const id = req.params.id;
    const commodity = id
      ? await MerchantCommodity_1.default.findOneAndUpdate(
          { _id: id, merchantId: merchant.merchantId },
          { $set: payload },
          { new: true, runValidators: true }
        )
      : await MerchantCommodity_1.default.create({ ...payload, merchantId: merchant.merchantId });
    res
      .status(id && !commodity ? 404 : 200)
      .json(
        commodity
          ? { success: true, data: commodity }
          : { success: false, message: 'Commodity not found' }
      );
  } catch (err) {
    console.error('upsertMerchantCommodity:', err);
    res.status(500).json({ success: false, message: 'Failed to save commodity' });
  }
};
exports.upsertMerchantCommodity = upsertMerchantCommodity;
const listNews = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const news = await MerchantNews_1.default
      .find({ merchantId: merchant.merchantId })
      .sort({ priority: -1, createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: news });
  } catch (err) {
    console.error('listNews:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch news' });
  }
};
exports.listNews = listNews;
const upsertNews = async (req, res) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const payload = {
      title: req.body.title,
      content: req.body.content,
      type: req.body.type,
      priority: Number(req.body.priority) || 1,
      active: req.body.active ?? true,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      placement: req.body.placement,
    };
    const id = req.params.id;
    const news = id
      ? await MerchantNews_1.default.findOneAndUpdate(
          { _id: id, merchantId: merchant.merchantId },
          { $set: payload },
          { new: true, runValidators: true }
        )
      : await MerchantNews_1.default.create({ ...payload, merchantId: merchant.merchantId });
    res
      .status(id && !news ? 404 : 200)
      .json(news ? { success: true, data: news } : { success: false, message: 'News not found' });
  } catch (err) {
    console.error('upsertNews:', err);
    res.status(500).json({ success: false, message: 'Failed to save news' });
  }
};
exports.upsertNews = upsertNews;
const getLiveScreen = async (req, res) => {
  try {
    const merchant = await Merchant_1.default
      .findOne({ slug: req.params.merchantSlug, status: 'Active' })
      .lean();
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Live merchant not found' });
      return;
    }
    const screenSlugParam = Array.isArray(req.params.screenSlug)
      ? req.params.screenSlug[0]
      : req.params.screenSlug;
    const screenSlug = slugify(screenSlugParam || 'main') || 'main';
    const screen = await PublishedScreen_1.ScreenRecord.findOne({
      merchantId: merchant.merchantId,
      screenSlug,
      live: true,
    }).lean();
    if (!screen) {
      res.status(404).json({ success: false, message: 'Live screen not found' });
      return;
    }
    const [layout, theme, profile, commodities, news, spotRateSettings] = await Promise.all([
      ScreenLayout_1.default
        .findOne({ merchantId: merchant.merchantId, layoutId: screen.layoutId })
        .lean(),
      MerchantTheme_1.default
        .findOne({ merchantId: merchant.merchantId, themeId: screen.themeId })
        .lean(),
      MerchantProfile_1.default.findOne({ merchantId: merchant.merchantId }).lean(),
      MerchantCommodity_1.default
        .find({ merchantId: merchant.merchantId, active: true })
        .sort({ createdAt: -1 })
        .lean(),
      MerchantNews_1.default
        .find({ merchantId: merchant.merchantId, active: true })
        .sort({ priority: -1 })
        .lean(),
      SpotRateSettings_1.default.findOne({ userId: merchant.userId }).lean(),
    ]);
    res.status(200).json({
      success: true,
      data: { merchant, profile, screen, theme, layout, commodities, news, spotRateSettings },
    });
  } catch (err) {
    console.error('getLiveScreen:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch live screen' });
  }
};
exports.getLiveScreen = getLiveScreen;
