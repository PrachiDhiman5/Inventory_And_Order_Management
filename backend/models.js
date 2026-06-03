const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 1. USER SCHEMA
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'seller', 'buyer'], default: 'buyer' },
  profile: {
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    companyName: { type: String, default: '' }
  }
});

// Encrypt password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 2. PRODUCT SCHEMA
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  baseUnit: { type: String, enum: ['g', 'kg', 'mL', 'L', 'items'], required: true },
  basePricePerUnit: { type: mongoose.Schema.Types.Decimal128, required: true },
  stockQuantity: { type: mongoose.Schema.Types.Decimal128, required: true }
});

// Convert Decimal128 values to strings for easier frontend reading
const transformProduct = (doc, ret) => {
  if (ret.basePricePerUnit) ret.basePricePerUnit = ret.basePricePerUnit.toString();
  if (ret.stockQuantity) ret.stockQuantity = ret.stockQuantity.toString();
  return ret;
};
ProductSchema.set('toJSON', { transform: transformProduct });
ProductSchema.set('toObject', { transform: transformProduct });

// 3. ORDER SCHEMA
const OrderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    orderedQuantity: { type: mongoose.Schema.Types.Decimal128, required: true },
    orderedUnit: { type: String, required: true },
    basePricePerUnit: { type: mongoose.Schema.Types.Decimal128, required: true },
    baseUnit: { type: String, required: true },
    calculatedPrice: { type: mongoose.Schema.Types.Decimal128, required: true },
    conversionFactor: { type: mongoose.Schema.Types.Decimal128, required: true }
  }],
  totalPrice: { type: mongoose.Schema.Types.Decimal128, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'delivered'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const transformOrder = (doc, ret) => {
  if (ret.totalPrice) ret.totalPrice = ret.totalPrice.toString();
  if (ret.items && Array.isArray(ret.items)) {
    ret.items.forEach(item => {
      if (item.orderedQuantity) item.orderedQuantity = item.orderedQuantity.toString();
      if (item.basePricePerUnit) item.basePricePerUnit = item.basePricePerUnit.toString();
      if (item.calculatedPrice) item.calculatedPrice = item.calculatedPrice.toString();
      if (item.conversionFactor) item.conversionFactor = item.conversionFactor.toString();
    });
  }
  return ret;
};
OrderSchema.set('toJSON', { transform: transformOrder });
OrderSchema.set('toObject', { transform: transformOrder });

// Export Models
const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);

module.exports = { User, Product, Order };
