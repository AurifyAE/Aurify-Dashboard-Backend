require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function upgrade() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.collection('users');

  const existingAdmin = await db.findOne({ email: 'admin' });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    await db.insertOne({
      companyName: 'Super Admin',
      email: 'admin@gmail.com',
      phone: '0000000000',
      passwordHash: passwordHash,
      role: 'super_admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Created admin user successfully.');
  } else {
    const passwordHash = await bcrypt.hash('admin123', 12);
    await db.updateOne({ email: 'admin' }, { $set: { role: 'super_admin', passwordHash } });
    console.log('Admin user already exists. Reset password and role.');
  }

  process.exit(0);
}

upgrade().catch(console.error);
