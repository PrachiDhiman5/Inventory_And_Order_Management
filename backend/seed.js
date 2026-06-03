const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { User, Product, Order } = require('./models');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connected for seeding...');

    // Clear old records
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared database.');

    // 1. Create Users
    const admin = await User.create({
      name: 'Global Admin',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      profile: { phone: '+91 99999 88888', address: 'Main Admin GIDC', companyName: 'Global Admin Corp' }
    });

    const seller = await User.create({
      name: 'Sunil Seller',
      email: 'seller@example.com',
      password: 'seller123',
      role: 'seller',
      profile: { phone: '+91 88888 77777', address: 'Chemical Park, Vadodara', companyName: 'MediLabs Chemicals' }
    });

    const buyer = await User.create({
      name: 'Rohan Buyer',
      email: 'buyer@example.com',
      password: 'buyer123',
      role: 'buyer',
      profile: { phone: '+91 77777 66666', address: 'Research Wing, Mumbai', companyName: 'BioHealth Research' }
    });

    console.log('Seeded Users:');
    console.log('- Admin: admin@example.com / admin123');
    console.log('- Seller: seller@example.com / seller123');
    console.log('- Buyer: buyer@example.com / buyer123');

    // 2. Create sample high-precision products
    await Product.create([
      {
        name: 'Platinum Catalyst (99.9%)',
        sku: 'CHEM-PT-01',
        description: 'Industrial-grade catalyst, stored in grams.',
        category: 'Catalysts',
        seller: seller._id,
        baseUnit: 'g',
        basePricePerUnit: mongoose.Types.Decimal128.fromString('12500.45785'),
        stockQuantity: mongoose.Types.Decimal128.fromString('100.50000')
      },
      {
        name: 'ACS Anhydrous Ethanol',
        sku: 'SOLV-ETH-02',
        description: 'ACS lab grade ethanol solvent, stored in Liters.',
        category: 'Solvents',
        seller: seller._id,
        baseUnit: 'L',
        basePricePerUnit: mongoose.Types.Decimal128.fromString('350.56000'),
        stockQuantity: mongoose.Types.Decimal128.fromString('500.00000')
      },
      {
        name: 'Sterile Glass Vials (10mL)',
        sku: 'VIAL-GL-10',
        description: 'USP sterile packaging vials, stored in items count.',
        category: 'Packaging',
        seller: seller._id,
        baseUnit: 'items',
        basePricePerUnit: mongoose.Types.Decimal128.fromString('12.50000'),
        stockQuantity: mongoose.Types.Decimal128.fromString('5000.00000')
      }
    ]);

    console.log('Seeded products.');
    mongoose.connection.close();
    console.log('Done.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
