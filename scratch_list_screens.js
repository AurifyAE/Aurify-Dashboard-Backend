const mongoose = require('mongoose');

const MONGODB_URI =
  'mongodb+srv://amaljithmk:Amal2003*@cluster0.hftu9c1.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  await mongoose.connect(MONGODB_URI);

  const ScreenLayout = mongoose.model(
    'ScreenLayout',
    new mongoose.Schema({}, { strict: false }),
    'screenlayouts'
  );
  const ScreenRecord = mongoose.model(
    'PublishedScreen',
    new mongoose.Schema({}, { strict: false }),
    'publishedscreens'
  );

  const layouts = await ScreenLayout.find({}).lean();
  const published = await ScreenRecord.find({}).lean();

  console.log('=== SCREEN LAYOUTS ===');
  layouts.forEach((l) => {
    console.log(`- Layout ID: ${l.layoutId}`);
    console.log(`  Name: ${l.name}`);
    console.log(`  Screen Slug: ${l.screenSlug}`);
    console.log(`  Status: ${l.status}`);
    console.log(`  Theme ID: ${l.themeId}`);
    console.log(`  Merchant ID: ${l.merchantId}`);
  });

  console.log('\n=== PUBLISHED SCREENS (Live URL mapping) ===');
  published.forEach((p) => {
    console.log(`- Live URL: ${p.liveUrl}`);
    console.log(`  Screen Slug: ${p.screenSlug}`);
    console.log(`  Layout ID: ${p.layoutId}`);
    console.log(`  Merchant ID: ${p.merchantId}`);
  });

  process.exit(0);
}

run();
