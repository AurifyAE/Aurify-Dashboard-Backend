import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware';
import Merchant from '../models/Merchant';
import MerchantProfile from '../models/MerchantProfile';
import MarketplaceTheme from '../models/MarketplaceTheme';
import MerchantTheme from '../models/MerchantTheme';
import ScreenLayout from '../models/ScreenLayout';
import MerchantCommodity from '../models/MerchantCommodity';
import MerchantNews from '../models/MerchantNews';
import { PublishedLayoutVersion, ScreenRecord } from '../models/PublishedScreen';
import SpotRateSettings from '../models/SpotRateSettings';
import SpotRate from '../models/SpotRate';

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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const merchantIdFromUser = (userId: string) => `m_${userId}`;

const getUserMerchant = async (req: AuthRequest) => {
  if (!req.user?.id) throw new Error('Unauthorized');
  const merchant = await Merchant.findOne({ userId: req.user.id });
  return merchant;
};

const ensureUserMerchant = async (req: AuthRequest) => {
  if (!req.user?.id) throw new Error('Unauthorized');
  const existing = await Merchant.findOne({ userId: req.user.id });
  if (!existing) throw new Error('Merchant profile not found. Please contact support.');
  return existing;
};

const ensureMarketplaceThemes = async () => {
  const count = await MarketplaceTheme.countDocuments();
  if (count > 0) return;
  await MarketplaceTheme.insertMany(THEME_SEEDS);
};

export const getMyMerchant = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: null });
      return;
    }
    const spotRateDoc = await SpotRate.findOne({ createdBy: merchant.userId }).lean();
    const merchantData = { ...merchant.toObject(), commodities: spotRateDoc?.commodities || [] };
    res.status(200).json({ success: true, data: merchantData });
  } catch (err) {
    console.error('getMyMerchant:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch merchant' });
  }
};

export const registerMerchant = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const existing = await Merchant.findOne({ userId: req.user.id });
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
    while (await Merchant.exists({ slug })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const merchant = await Merchant.create({
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

    await MerchantProfile.create({
      merchantId: merchant.merchantId,
      website: merchant.website,
      address: merchant.address,
    });

    res.status(201).json({ success: true, data: merchant });
  } catch (err: any) {
    console.error('registerMerchant:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to register merchant' });
  }
};

export const approveMerchant = async (req: AuthRequest, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { status } = req.body;
    if (!['Pending', 'Active', 'Suspended'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid merchant status' });
      return;
    }
    const merchant = await Merchant.findOneAndUpdate(
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

export const checkMerchantSlug = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await ensureUserMerchant(req);
    const slug = String(req.query.slug || '').trim().toLowerCase();

    if (!slug) {
      res.status(200).json({ success: true, data: { available: false, message: 'Slug is required.' } });
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(200).json({
        success: true,
        data: { available: false, message: 'Only lowercase letters, numbers, and hyphens are allowed.' },
      });
      return;
    }

    const RESERVED_SLUGS = [
      'admin', 'api', 'assets', 'static', 'login', 'logout', 'register',
      'screen', 'builder', 'dashboard', 'preview', 'settings', 'support',
      'help', 'favicon.ico', 'robots.txt'
    ];
    if (RESERVED_SLUGS.includes(slug)) {
      res.status(200).json({
        success: true,
        data: { available: false, message: 'This slug is a reserved system keyword.' },
      });
      return;
    }

    const exists = await Merchant.findOne({ slug, merchantId: { $ne: merchant.merchantId } });
    if (exists) {
      res.status(200).json({
        success: true,
        data: { available: false, message: 'This merchant URL is already taken.' },
      });
      return;
    }

    res.status(200).json({ success: true, data: { available: true } });
  } catch (err) {
    console.error('checkMerchantSlug:', err);
    res.status(500).json({ success: false, message: 'Failed to validate merchant slug' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await ensureUserMerchant(req);
    const merchantPatch: Record<string, unknown> = {};

    // Check if slug is changing
    if (req.body.slug !== undefined && req.body.slug !== merchant.slug) {
      const newSlug = slugify(req.body.slug);

      if (!newSlug) {
        res.status(400).json({ success: false, message: 'Merchant slug is required.' });
        return;
      }

      if (!/^[a-z0-9-]+$/.test(newSlug)) {
        res.status(400).json({
          success: false,
          message: 'Merchant slug can only contain lowercase letters, numbers and hyphens.',
        });
        return;
      }

      const RESERVED_SLUGS = [
        'admin', 'api', 'assets', 'static', 'login', 'logout', 'register',
        'screen', 'builder', 'dashboard', 'preview', 'settings', 'support',
        'help', 'favicon.ico', 'robots.txt'
      ];
      if (RESERVED_SLUGS.includes(newSlug)) {
        res.status(400).json({
          success: false,
          message: 'This slug is a reserved system keyword.',
        });
        return;
      }

      const exists = await Merchant.findOne({ slug: newSlug, merchantId: { $ne: merchant.merchantId } });
      if (exists) {
        res.status(409).json({
          success: false,
          message: 'This merchant URL is already taken by another company.',
        });
        return;
      }

      merchantPatch.slug = newSlug;

      // Update all ScreenRecords liveUrl for this merchant to point to new slug
      const screens = await ScreenRecord.find({ merchantId: merchant.merchantId });
      for (const screen of screens) {
        const liveUrl = `${SCREEN_BASE_URL}/${newSlug}/${screen.screenSlug}`;
        await ScreenRecord.updateOne({ _id: screen._id }, { $set: { liveUrl } });
      }
    }

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
      await Merchant.updateOne(
        { merchantId: merchant.merchantId },
        { $set: merchantPatch },
        { runValidators: true }
      );
    }
    const profile = await MerchantProfile.findOneAndUpdate(
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
    const updatedMerchant = await Merchant.findOne({ merchantId: merchant.merchantId });
    res.status(200).json({ success: true, data: { merchant: updatedMerchant, profile } });
  } catch (err) {
    console.error('updateProfile:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const profile = await MerchantProfile.findOne({ merchantId: merchant.merchantId }).lean();
    res.status(200).json({ success: true, data: { merchant, profile } });
  } catch (err) {
    console.error('getProfile:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

export const listThemes = async (_req: AuthRequest, res: Response) => {
  try {
    await ensureMarketplaceThemes();
    const themes = await MarketplaceTheme.find({ active: true })
      .sort({ category: 1, name: 1 })
      .lean();
    res.status(200).json({ success: true, data: themes });
  } catch (err) {
    console.error('listThemes:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch themes' });
  }
};

export const installTheme = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const theme = await MarketplaceTheme.findById(req.params.themeId).lean();
    if (!theme) {
      res.status(404).json({ success: false, message: 'Theme not found' });
      return;
    }
    const installed = await MerchantTheme.findOneAndUpdate(
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

export const listMerchantThemes = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const themes = await MerchantTheme.find({ merchantId: merchant.merchantId })
      .sort({ installedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: themes });
  } catch (err) {
    console.error('listMerchantThemes:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch installed themes' });
  }
};

export const listLayouts = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const layouts = await ScreenLayout.find({ merchantId: merchant.merchantId })
      .sort({ updatedAt: -1 })
      .lean();
    const layoutsWithSlug = layouts.map((l) => ({ ...l, merchantSlug: merchant.slug }));
    res.status(200).json({ success: true, data: layoutsWithSlug });
  } catch (err) {
    console.error('listLayouts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch layouts' });
  }
};

export const checkScreenSlug = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await ensureUserMerchant(req);
    const slug = String(req.query.slug || '').trim().toLowerCase();
    const excludeLayoutId = String(req.query.excludeLayoutId || '').trim();

    if (!slug) {
      res.status(200).json({ success: true, data: { available: false, message: 'Slug is required.' } });
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(200).json({
        success: true,
        data: { available: false, message: 'Only lowercase letters, numbers, and hyphens are allowed.' },
      });
      return;
    }

    const RESERVED_SLUGS = [
      'admin', 'api', 'assets', 'static', 'login', 'logout', 'register',
      'screen', 'builder', 'dashboard', 'preview', 'settings', 'support',
      'help', 'favicon.ico', 'robots.txt'
    ];
    if (RESERVED_SLUGS.includes(slug)) {
      res.status(200).json({
        success: true,
        data: { available: false, message: 'This slug is a reserved system keyword.' },
      });
      return;
    }

    const query: Record<string, any> = {
      merchantId: merchant.merchantId,
      screenSlug: slug,
    };
    if (excludeLayoutId) {
      query.layoutId = { $ne: excludeLayoutId };
    }

    const exists = await ScreenLayout.findOne(query);
    if (exists) {
      res.status(200).json({
        success: true,
        data: { available: false, message: 'This URL is already in use.' },
      });
      return;
    }

    res.status(200).json({ success: true, data: { available: true } });
  } catch (err) {
    console.error('checkScreenSlug:', err);
    res.status(500).json({ success: false, message: 'Failed to validate slug' });
  }
};

export const saveLayout = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await ensureUserMerchant(req);

    // Check screen limits if this is a new layout
    if (!req.body.layoutId) {
      const currentScreensCount = await ScreenLayout.countDocuments({
        merchantId: merchant.merchantId,
      });
      if (currentScreensCount >= (merchant.maxScreens || 1)) {
        res.status(403).json({
          success: false,
          message: `Screen limit reached. Your plan allows up to ${merchant.maxScreens || 1} screen(s). Please upgrade to add more.`,
        });
        return;
      }
    }

    const layoutId = req.body.layoutId || `layout_${new mongoose.Types.ObjectId().toString()}`;
    const screenSlug = slugify(req.body.screenSlug || 'main') || 'main';

    // ── Slug uniqueness check ──
    const RESERVED_SLUGS = [
      'admin', 'api', 'assets', 'static', 'login', 'logout', 'register',
      'screen', 'builder', 'dashboard', 'preview', 'settings', 'support',
      'help', 'favicon.ico', 'robots.txt'
    ];
    if (RESERVED_SLUGS.includes(screenSlug)) {
      res.status(400).json({
        success: false,
        message: 'This slug is a reserved system keyword.',
      });
      return;
    }

    const exists = await ScreenLayout.findOne({
      merchantId: merchant.merchantId,
      screenSlug,
      layoutId: { $ne: layoutId }
    });
    if (exists) {
      res.status(409).json({
        success: false,
        message: 'This URL is already taken by you. Please choose another slug.',
      });
      return;
    }

    const layout = await ScreenLayout.findOneAndUpdate(
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
  } catch (err: any) {
    console.error('saveLayout:', err);
    if (err.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'This URL was just taken. Please choose another slug.',
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to save layout';
    res.status(500).json({ success: false, message });
  }
};

export const deleteLayout = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const { layoutId } = req.params;

    // Delete from ScreenLayout
    await ScreenLayout.deleteOne({ layoutId, merchantId: merchant.merchantId });

    // Also remove from PublishedScreens and un-live the ScreenRecord if applicable
    await PublishedLayoutVersion.deleteMany({ layoutId, merchantId: merchant.merchantId });
    await ScreenRecord.updateMany(
      { layoutId, merchantId: merchant.merchantId },
      { $set: { live: false, layoutId: null, themeId: null, liveUrl: null } }
    );

    res.status(200).json({ success: true, message: 'Layout deleted successfully' });
  } catch (err) {
    console.error('deleteLayout:', err);
    res.status(500).json({ success: false, message: 'Failed to delete layout' });
  }
};

export const publishLayout = async (req: AuthRequest, res: Response) => {
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
    const layout = await ScreenLayout.findOne({
      layoutId: req.params.layoutId,
      merchantId: merchant.merchantId,
    }).lean();
    if (!layout) {
      res.status(404).json({ success: false, message: 'Layout not found' });
      return;
    }
    if (!layout.themeId && !layout.header?.layout) {
      res
        .status(400)
        .json({ success: false, message: 'Theme or layout selected validation failed' });
      return;
    }

    const latest = await PublishedLayoutVersion.findOne({
      merchantId: merchant.merchantId,
      layoutId: layout.layoutId,
    }).sort({ version: -1 });
    const version = (latest?.version || 0) + 1;
    const published = await PublishedLayoutVersion.create({
      layoutId: layout.layoutId,
      merchantId: merchant.merchantId,
      status: 'published',
      version,
      snapshot: JSON.parse(JSON.stringify(layout)) as Record<string, unknown>,
    });
    await ScreenLayout.updateOne({ layoutId: layout.layoutId }, { $set: { status: 'published' } });
    const liveUrl = `${SCREEN_BASE_URL}/${merchant.slug}/${layout.screenSlug}`;
    const screen = await ScreenRecord.findOneAndUpdate(
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

export const listMerchantCommodities = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const doc = await MerchantCommodity.findOne({ merchantId: merchant.merchantId }).lean();
    const commodities = doc?.commodities
      ? doc.commodities.sort(
          (a, b) => (b as any).createdAt?.getTime() - (a as any).createdAt?.getTime()
        )
      : [];
    res.status(200).json({ success: true, data: commodities });
  } catch (err) {
    console.error('listMerchantCommodities:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch merchant commodities' });
  }
};

export const upsertMerchantCommodity = async (req: AuthRequest, res: Response) => {
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

    let doc = await MerchantCommodity.findOne({ merchantId: merchant.merchantId });
    if (!doc) {
      doc = new MerchantCommodity({ merchantId: merchant.merchantId, commodities: [] });
    }

    if (id) {
      const idx = doc.commodities.findIndex((c) => c._id?.toString() === id);
      if (idx > -1) {
        doc.commodities[idx] = Object.assign(doc.commodities[idx], payload);
      } else {
        res.status(404).json({ success: false, message: 'Commodity not found' });
        return;
      }
    } else {
      doc.commodities.push(payload as any);
    }

    await doc.save();

    const savedCommodity = id
      ? doc.commodities.find((c) => c._id?.toString() === id)
      : doc.commodities[doc.commodities.length - 1];

    res.status(200).json({ success: true, data: savedCommodity });
  } catch (err) {
    console.error('upsertMerchantCommodity:', err);
    res.status(500).json({ success: false, message: 'Failed to save commodity' });
  }
};

export const deleteMerchantCommodity = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const id = req.params.id;

    const doc = await MerchantCommodity.findOneAndUpdate(
      { merchantId: merchant.merchantId },
      { $pull: { commodities: { _id: id } } },
      { new: true }
    );

    if (!doc) {
      res.status(404).json({ success: false, message: 'Commodity not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Commodity deleted successfully' });
  } catch (err) {
    console.error('deleteMerchantCommodity:', err);
    res.status(500).json({ success: false, message: 'Failed to delete commodity' });
  }
};

export const listNews = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const doc = await MerchantNews.findOne({ merchantId: merchant.merchantId }).lean();
    const news = doc?.news
      ? [...doc.news].sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1))
      : [];
    res.status(200).json({ success: true, data: news });
  } catch (err) {
    console.error('listNews:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch news' });
  }
};

export const upsertNews = async (req: AuthRequest, res: Response) => {
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

    let doc = await MerchantNews.findOne({ merchantId: merchant.merchantId });
    if (!doc) {
      doc = new MerchantNews({ merchantId: merchant.merchantId, news: [] });
    }

    if (id) {
      const idx = doc.news.findIndex((n) => n._id?.toString() === id);
      if (idx > -1) {
        doc.news[idx] = Object.assign(doc.news[idx], payload);
      } else {
        res.status(404).json({ success: false, message: 'News item not found' });
        return;
      }
    } else {
      doc.news.push(payload as any);
    }

    await doc.save();

    const savedItem = id
      ? doc.news.find((n) => n._id?.toString() === id)
      : doc.news[doc.news.length - 1];

    res.status(200).json({ success: true, data: savedItem });
  } catch (err) {
    console.error('upsertNews:', err);
    res.status(500).json({ success: false, message: 'Failed to save news' });
  }
};

export const deleteNews = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await getUserMerchant(req);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Register merchant first' });
      return;
    }
    const result = await MerchantNews.findOneAndUpdate(
      { merchantId: merchant.merchantId },
      { $pull: { news: { _id: new mongoose.Types.ObjectId(req.params.id as string) } } },
      { new: true }
    );
    if (!result) {
      res.status(404).json({ success: false, message: 'News item not found' });
      return;
    }
    res.json({ success: true, message: 'News deleted successfully' });
  } catch (err) {
    console.error('deleteNews:', err);
    res.status(500).json({ success: false, message: 'Failed to delete news' });
  }
};

export const getLiveScreen = async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await Merchant.findOne({
      slug: req.params.merchantSlug,
      status: 'Active',
    }).lean();
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Live merchant not found' });
      return;
    }
    const screenSlugParam = Array.isArray(req.params.screenSlug)
      ? req.params.screenSlug[0]
      : req.params.screenSlug;
    const screenSlug = slugify(screenSlugParam || 'main') || 'main';
    const screen = await ScreenRecord.findOne({
      merchantId: merchant.merchantId,
      screenSlug,
      live: true,
    }).lean();
    if (!screen) {
      res.status(404).json({ success: false, message: 'Live screen not found' });
      return;
    }
    const [layout, theme, profile, spotRateDoc, news, spotRateSettings] = await Promise.all([
      ScreenLayout.findOne({ merchantId: merchant.merchantId, layoutId: screen.layoutId }).lean(),
      MerchantTheme.findOne({ merchantId: merchant.merchantId, themeId: screen.themeId }).lean(),
      MerchantProfile.findOne({ merchantId: merchant.merchantId }).lean(),
      SpotRate.findOne({ createdBy: merchant.userId }).lean(),
      MerchantNews.findOne({ merchantId: merchant.merchantId }).lean(),
      SpotRateSettings.findOne({ userId: merchant.userId }).lean(),
    ]);

    const commodities = spotRateDoc?.commodities || [];
    const newsItems = (news as any)?.news
      ? (news as any).news
          .filter((n: any) => n.active)
          .sort((a: any, b: any) => (b.priority ?? 1) - (a.priority ?? 1))
      : [];

    res.status(200).json({
      success: true,
      data: {
        merchant,
        profile,
        screen,
        theme,
        layout,
        commodities,
        news: newsItems,
        spotRateSettings,
      },
    });
  } catch (err) {
    console.error('getLiveScreen:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch live screen' });
  }
};

export const listAllLiveScreens = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const screens = await ScreenRecord.find({ live: true }).lean();
    const merchantIds = screens.map((s) => s.merchantId);
    const merchants = await Merchant.find({ merchantId: { $in: merchantIds } }).lean();
    const merchantMap = new Map(merchants.map((m) => [m.merchantId, m]));

    const data = screens.map((s) => {
      const merchant = merchantMap.get(s.merchantId);
      return {
        _id: s._id,
        merchantId: s.merchantId,
        screenSlug: s.screenSlug,
        layoutId: s.layoutId,
        liveUrl: s.liveUrl,
        companyName: merchant?.companyName || 'Unknown Merchant',
        logo: merchant?.logo || '',
        slug: merchant?.slug || '',
      };
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('listAllLiveScreens:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch live screens' });
  }
};
