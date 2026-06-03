const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Decimal = require('decimal.js');
const dotenv = require('dotenv');

// Load settings and models
dotenv.config();
const { User, Product, Order } = require('./models');

// Configure decimal.js for exact arithmetic up to 5+ decimal places
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected to Atlas'))
  .catch(err => console.error('Database connection failed:', err));

// ==========================================
// 2. UNIT CONVERSION MATH LOGIC (using decimal.js)
// ==========================================
const UNIT_DIMENSIONS = {
  g: 'weight', kg: 'weight',
  mL: 'volume', L: 'volume',
  items: 'count'
};

const CONVERSION_TO_BASE = {
  weight: { base: 'kg', factors: { kg: new Decimal(1), g: new Decimal('0.001') } },
  volume: { base: 'L', factors: { L: new Decimal(1), mL: new Decimal('0.001') } },
  count: { base: 'items', factors: { items: new Decimal(1) } }
};

function getConversionFactor(fromUnit, toUnit) {
  const fromDim = UNIT_DIMENSIONS[fromUnit];
  const toDim = UNIT_DIMENSIONS[toUnit];

  if (!fromDim || !toDim) throw new Error('Invalid unit selection');
  if (fromDim !== toDim) throw new Error('Cannot convert across dimensions (e.g. weight to volume)');

  const factors = CONVERSION_TO_BASE[fromDim].factors;
  return factors[fromUnit].div(factors[toUnit]);
}

function calculateItemPrice(quantity, orderUnit, basePrice, baseUnit) {
  const q = new Decimal(quantity);
  const bp = new Decimal(basePrice);
  const factor = getConversionFactor(orderUnit, baseUnit);
  return q.mul(factor).mul(bp); // Qty * factor * price
}

function convertQuantity(quantity, fromUnit, toUnit) {
  const q = new Decimal(quantity);
  const factor = getConversionFactor(fromUnit, toUnit);
  return q.mul(factor);
}

// ==========================================
// 3. MIDDLEWARES (Auth & RBAC)
// ==========================================
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey12345!');
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid Token' });
    }
  }
  res.status(401).json({ success: false, message: 'No Token provided' });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Access denied for role: ${req.user?.role}` });
    }
    next();
  };
};

// ==========================================
// 4. API ENDPOINTS
// ==========================================

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, address, companyName } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
      name, email, password, role,
      profile: { phone, address, companyName }
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretjwtkey12345!', { expiresIn: '30d' });
    res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role, profile: user.profile, token } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretjwtkey12345!', { expiresIn: '30d' });
      return res.json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role, profile: user.profile, token } });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/auth/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- PRODUCT ROUTES ---
app.get('/api/products', protect, async (req, res) => {
  try {
    const products = await Product.find({}).populate('seller', 'name email profile');
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/products', protect, authorize('admin', 'seller'), async (req, res) => {
  try {
    const { name, sku, description, category, baseUnit, basePricePerUnit, stockQuantity, sellerId } = req.body;
    
    let seller = req.user._id;
    if (req.user.role === 'admin' && sellerId) seller = sellerId;

    const skuExists = await Product.findOne({ sku });
    if (skuExists) return res.status(400).json({ success: false, message: 'SKU already exists' });

    const product = await Product.create({
      name, sku, description, category, baseUnit, seller,
      basePricePerUnit: mongoose.Types.Decimal128.fromString(String(basePricePerUnit)),
      stockQuantity: mongoose.Types.Decimal128.fromString(String(stockQuantity))
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/products/:id', protect, authorize('admin', 'seller'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Sellers can only edit their own products
    if (req.user.role !== 'admin' && product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this product' });
    }

    const { name, sku, description, category, baseUnit, basePricePerUnit, stockQuantity } = req.body;
    if (name) product.name = name;
    if (sku) product.sku = sku;
    if (description !== undefined) product.description = description;
    if (category) product.category = category;
    if (baseUnit) product.baseUnit = baseUnit;
    if (basePricePerUnit !== undefined) product.basePricePerUnit = mongoose.Types.Decimal128.fromString(String(basePricePerUnit));
    if (stockQuantity !== undefined) product.stockQuantity = mongoose.Types.Decimal128.fromString(String(stockQuantity));

    await product.save();
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/products/:id', protect, authorize('admin', 'seller'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (req.user.role !== 'admin' && product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- ORDER ROUTES ---
app.post('/api/orders', protect, async (req, res) => {
  try {
    const { items } = req.body; // Array of { productId, orderedQuantity, orderedUnit }
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Order is empty' });

    let totalPrice = new Decimal(0);
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ success: false, message: `Product not found` });

      const price = calculateItemPrice(item.orderedQuantity, item.orderedUnit, product.basePricePerUnit.toString(), product.baseUnit);
      const factor = getConversionFactor(item.orderedUnit, product.baseUnit);

      totalPrice = totalPrice.plus(price);

      orderItems.push({
        product: product._id,
        productName: product.name,
        orderedQuantity: mongoose.Types.Decimal128.fromString(String(item.orderedQuantity)),
        orderedUnit: item.orderedUnit,
        basePricePerUnit: product.basePricePerUnit,
        baseUnit: product.baseUnit,
        calculatedPrice: mongoose.Types.Decimal128.fromString(price.toString()),
        conversionFactor: mongoose.Types.Decimal128.fromString(factor.toString())
      });
    }

    const order = await Order.create({
      buyer: req.user._id,
      items: orderItems,
      totalPrice: mongoose.Types.Decimal128.fromString(totalPrice.toString()),
      status: 'pending'
    });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/orders', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'buyer') {
      query.buyer = req.user._id;
    } else if (req.user.role === 'seller') {
      const myProducts = await Product.find({ seller: req.user._id }).select('_id');
      query['items.product'] = { $in: myProducts.map(p => p._id) };
    }

    const orders = await Order.find(query)
      .populate('buyer', 'name email profile')
      .populate('items.product', 'name sku category baseUnit basePricePerUnit seller')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/orders/:id/status', protect, authorize('admin', 'seller'), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Sellers can only update orders that contain their products
    if (req.user.role === 'seller') {
      const ownsItem = order.items.some(item => item.product && item.product.seller.toString() === req.user._id.toString());
      if (!ownsItem) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const prevStatus = order.status;
    order.status = status;

    // --- INVENTORY STOCK SYNC ---
    // If going to approved (and wasn't before): Deduct stock
    if (status === 'approved' && prevStatus !== 'approved') {
      for (const item of order.items) {
        const product = await Product.findById(item.product._id);
        if (product) {
          const deduction = convertQuantity(item.orderedQuantity.toString(), item.orderedUnit, product.baseUnit);
          const currentStock = new Decimal(product.stockQuantity.toString());
          product.stockQuantity = mongoose.Types.Decimal128.fromString(currentStock.minus(deduction).toString());
          await product.save();
        }
      }
    }
    // If approved order is canceled/rejected: Restore stock
    if ((status === 'rejected' || status === 'pending') && prevStatus === 'approved') {
      for (const item of order.items) {
        const product = await Product.findById(item.product._id);
        if (product) {
          const addition = convertQuantity(item.orderedQuantity.toString(), item.orderedUnit, product.baseUnit);
          const currentStock = new Decimal(product.stockQuantity.toString());
          product.stockQuantity = mongoose.Types.Decimal128.fromString(currentStock.plus(addition).toString());
          await product.save();
        }
      }
    }

    await order.save();
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
