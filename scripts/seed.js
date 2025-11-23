require('dotenv').config();
const mongoose = require('mongoose');
const Voucher = require('../src/models/voucher.model');
const Promotion = require('../src/models/promotion.model');
const Product = require('../src/models/product.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voucher-api';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Voucher.deleteMany({});
    await Promotion.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data');

    // Create products
    const products = await Product.insertMany([
      // Electronics
      { name: 'Laptop Pro 15"', category: 'electronics', price: 1299.99, description: 'High-performance laptop', inStock: true },
      { name: 'Wireless Mouse', category: 'electronics', price: 29.99, description: 'Ergonomic wireless mouse', inStock: true },
      { name: 'USB-C Hub', category: 'electronics', price: 49.99, description: '7-in-1 USB-C adapter', inStock: true },
      { name: 'Bluetooth Headphones', category: 'electronics', price: 199.99, description: 'Noise-cancelling headphones', inStock: true },
      { name: 'Smartphone Stand', category: 'electronics', price: 15.99, description: 'Adjustable phone stand', inStock: true },
      
      // Fashion & Clothing
      { name: 'Cotton T-Shirt', category: 'fashion', price: 24.99, description: 'Premium cotton tee', inStock: true },
      { name: 'Denim Jeans', category: 'clothing', price: 79.99, description: 'Classic fit jeans', inStock: true },
      { name: 'Running Shoes', category: 'fashion', price: 89.99, description: 'Lightweight running shoes', inStock: true },
      { name: 'Leather Wallet', category: 'fashion', price: 39.99, description: 'Genuine leather wallet', inStock: true },
      { name: 'Winter Jacket', category: 'clothing', price: 149.99, description: 'Warm winter jacket', inStock: true },
      
      // Books
      { name: 'JavaScript Guide', category: 'books', price: 45.99, description: 'Complete JS programming guide', inStock: true },
      { name: 'Design Patterns', category: 'books', price: 52.99, description: 'Software design patterns', inStock: true },
      { name: 'Clean Code', category: 'books', price: 38.99, description: 'Writing maintainable code', inStock: true },
      
      // Furniture & Home
      { name: 'Office Chair', category: 'furniture', price: 299.99, description: 'Ergonomic office chair', inStock: true },
      { name: 'Standing Desk', category: 'furniture', price: 449.99, description: 'Adjustable standing desk', inStock: true },
      { name: 'Table Lamp', category: 'home', price: 34.99, description: 'LED desk lamp', inStock: true },
      { name: 'Bookshelf', category: 'furniture', price: 129.99, description: '5-tier bookshelf', inStock: true },
      
      // Sports
      { name: 'Yoga Mat', category: 'sports', price: 29.99, description: 'Non-slip yoga mat', inStock: true },
      { name: 'Dumbbell Set', category: 'sports', price: 89.99, description: '20kg dumbbell set', inStock: true },
      { name: 'Tennis Racket', category: 'sports', price: 119.99, description: 'Professional tennis racket', inStock: true },
      
      // Toys
      { name: 'Building Blocks Set', category: 'toys', price: 49.99, description: '500-piece building set', inStock: true },
      { name: 'Remote Control Car', category: 'toys', price: 39.99, description: 'RC racing car', inStock: true },
      { name: 'Board Game', category: 'toys', price: 34.99, description: 'Family board game', inStock: true },
      
      // Food & Groceries
      { name: 'Organic Coffee Beans', category: 'food', price: 18.99, description: '1kg premium coffee', inStock: true },
      { name: 'Olive Oil', category: 'groceries', price: 12.99, description: 'Extra virgin olive oil', inStock: true },
      { name: 'Protein Powder', category: 'food', price: 45.99, description: 'Whey protein 2kg', inStock: true },
      { name: 'Green Tea', category: 'groceries', price: 8.99, description: 'Organic green tea', inStock: true },
      
      // Beauty
      { name: 'Face Cream', category: 'beauty', price: 29.99, description: 'Moisturizing face cream', inStock: true },
      { name: 'Shampoo', category: 'beauty', price: 14.99, description: 'Natural shampoo', inStock: true },
      { name: 'Perfume', category: 'beauty', price: 79.99, description: 'Luxury perfume 50ml', inStock: true }
    ]);
    console.log(`Created ${products.length} products`);

    // Get specific product IDs for promotions
    const electronicsProducts = products.filter(p => p.category === 'electronics');
    const bookProducts = products.filter(p => p.category === 'books');
    const clearanceProducts = products.slice(0, 4); // First 4 products for clearance

    // Create sample vouchers
    const vouchers = await Voucher.insertMany([
      {
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        uses: 0,
        maxDiscountAmount: 100,
        deletedAt: null
      },
      {
        code: 'FLAT50',
        type: 'fixed',
        value: 50,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        usageLimit: 50,
        uses: 0,
        minOrderValue: 200,
        deletedAt: null
      },
      {
        code: 'MEGA50',
        type: 'percentage',
        value: 50,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 20,
        uses: 0,
        maxDiscountAmount: 150,
        minOrderValue: 100,
        deletedAt: null
      },
      {
        code: 'WELCOME5',
        type: 'fixed',
        value: 5,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        usageLimit: 1000,
        uses: 0,
        deletedAt: null
      },
      {
        code: 'VIP100',
        type: 'fixed',
        value: 100,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 10,
        uses: 0,
        minOrderValue: 500,
        deletedAt: null
      },
      {
        code: 'LIMITED',
        type: 'percentage',
        value: 15,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 5,
        uses: 4,
        maxDiscountAmount: 50,
        deletedAt: null
      },
      {
        code: 'SOLDOUT',
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 10,
        uses: 10,
        maxDiscountAmount: 100,
        deletedAt: null
      },
      {
        code: 'EXPIRED',
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        usageLimit: 10,
        uses: 0,
        maxDiscountAmount: 50,
        deletedAt: null
      },
      {
        code: 'DELETED',
        type: 'percentage',
        value: 25,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 50,
        uses: 5,
        maxDiscountAmount: 75,
        deletedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        code: 'LASTDAY',
        type: 'fixed',
        value: 30,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        usageLimit: 100,
        uses: 0,
        minOrderValue: 100,
        deletedAt: null
      }
    ]);
    console.log(`Created ${vouchers.length} vouchers`);

    // Create sample promotions
    const promotions = await Promotion.insertMany([
      {
        code: 'ELECTRONICS20',
        eligibleCategories: ['electronics'],
        eligibleItems: [],
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 200,
        uses: 0,
        maxDiscountAmount: 200,
        deletedAt: null
      },
      {
        code: 'FASHION15',
        eligibleCategories: ['fashion', 'clothing'],
        eligibleItems: [],
        type: 'percentage',
        value: 15,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        usageLimit: 150,
        uses: 0,
        minOrderValue: 100,
        maxDiscountAmount: 150,
        deletedAt: null
      },
      {
        code: 'ITEM50OFF',
        eligibleCategories: [],
        eligibleItems: electronicsProducts.slice(0, 3).map(p => p._id),
        type: 'fixed',
        value: 50,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        uses: 0,
        deletedAt: null
      },
      {
        code: 'BOOKS25',
        eligibleCategories: ['books'],
        eligibleItems: bookProducts.map(p => p._id),
        type: 'percentage',
        value: 25,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 50,
        uses: 0,
        maxDiscountAmount: 100,
        deletedAt: null
      },
      {
        code: 'NEWUSER',
        eligibleCategories: [],
        eligibleItems: [],
        type: 'fixed',
        value: 25,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        usageLimit: 1000,
        uses: 0,
        deletedAt: null
      },
      {
        code: 'FURNITURE100',
        eligibleCategories: ['furniture', 'home'],
        eligibleItems: [],
        type: 'fixed',
        value: 100,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 30,
        uses: 0,
        minOrderValue: 500,
        deletedAt: null
      },
      {
        code: 'SPORTS30',
        eligibleCategories: ['sports'],
        eligibleItems: [],
        type: 'percentage',
        value: 30,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        uses: 0,
        maxDiscountAmount: 80,
        deletedAt: null
      },
      {
        code: 'ALMOSTGONE',
        eligibleCategories: ['toys'],
        eligibleItems: [],
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 3,
        uses: 2,
        maxDiscountAmount: 50,
        deletedAt: null
      },
      {
        code: 'OLDPROMO',
        eligibleCategories: ['all'],
        eligibleItems: [],
        type: 'percentage',
        value: 30,
        expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        uses: 15,
        maxDiscountAmount: 300,
        deletedAt: null
      },
      {
        code: 'REMOVED',
        eligibleCategories: ['beauty'],
        eligibleItems: [],
        type: 'percentage',
        value: 25,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        uses: 10,
        maxDiscountAmount: 100,
        deletedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        code: 'CLEARANCE',
        eligibleCategories: [],
        eligibleItems: clearanceProducts.map(p => p._id),
        type: 'percentage',
        value: 40,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usageLimit: 200,
        uses: 0,
        maxDiscountAmount: 200,
        deletedAt: null
      },
      {
        code: 'FOOD10',
        eligibleCategories: ['food', 'groceries'],
        eligibleItems: [],
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 500,
        uses: 0,
        minOrderValue: 50,
        maxDiscountAmount: 30,
        deletedAt: null
      }
    ]);
    console.log(`Created ${promotions.length} promotions`);

    console.log('\n=== Sample data created successfully! ===\n');
    
    console.log('Sample Product IDs for testing:');
    console.log(`  Laptop: ${products[0]._id}`);
    console.log(`  Wireless Mouse: ${products[1]._id}`);
    console.log(`  Cotton T-Shirt: ${products[5]._id}`);
    console.log(`  JavaScript Guide: ${products[10]._id}`);
    console.log(`  Office Chair: ${products[13]._id}`);
    
    console.log('\nVouchers:');
    vouchers.forEach(v => console.log(`  - ${v.code}: ${v.type} ${v.value}${v.type === 'percentage' ? '%' : ''}`));
    
    console.log('\nPromotions:');
    promotions.forEach(p => console.log(`  - ${p.code}: ${p.type} ${p.value}${p.type === 'percentage' ? '%' : ''}`));

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seed();
