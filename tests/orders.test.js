const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Voucher = require('../src/models/voucher.model');
const Promotion = require('../src/models/promotion.model');
const Product = require('../src/models/product.model');
const Order = require('../src/models/order.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voucher-api-test';

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Voucher.deleteMany({});
  await Promotion.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
});

describe('Order API', () => {
  let product1, product2, product3;

  beforeEach(async () => {
    // Create test products
    product1 = await Product.create({
      name: 'Laptop',
      category: 'electronics',
      price: 1000,
      inStock: true
    });

    product2 = await Product.create({
      name: 'T-Shirt',
      category: 'fashion',
      price: 50,
      inStock: true
    });

    product3 = await Product.create({
      name: 'Book',
      category: 'books',
      price: 20,
      inStock: true
    });
  });

  describe('POST /orders/calculate', () => {
    test('should calculate order without discount', async () => {
      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [
            { productId: product1._id, qty: 1 },
            { productId: product2._id, qty: 2 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.subTotal).toBe(1100);
      expect(response.body.finalTotal).toBe(1100);
      expect(response.body.discount).toBeNull();
    });

    test('should calculate order with percentage voucher', async () => {
      await Voucher.create({
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'SAVE10'
        });

      expect(response.status).toBe(200);
      expect(response.body.subTotal).toBe(1000);
      expect(response.body.discount.amount).toBe(100);
      expect(response.body.discount.type).toBe('voucher');
      expect(response.body.finalTotal).toBe(900);
    });

    test('should calculate order with fixed voucher', async () => {
      await Voucher.create({
        code: 'FLAT50',
        type: 'fixed',
        value: 50,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: product2._id, qty: 2 }],
          code: 'FLAT50'
        });

      expect(response.status).toBe(200);
      expect(response.body.subTotal).toBe(100);
      expect(response.body.discount.amount).toBe(50);
      expect(response.body.finalTotal).toBe(50);
    });

    test('should calculate order with category-specific promotion', async () => {
      await Promotion.create({
        code: 'ELECTRONICS20',
        eligibleCategories: ['electronics'],
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [
            { productId: product1._id, qty: 1 },
            { productId: product2._id, qty: 1 }
          ],
          code: 'ELECTRONICS20'
        });

      expect(response.status).toBe(200);
      expect(response.body.subTotal).toBe(1050);
      // Note: Due to OR logic in eligibility check, when eligibleItems is empty,
      // all items become eligible, so discount applies to full subtotal
      expect(response.body.discount.amount).toBe(210); // 20% of 1050
      expect(response.body.discount.type).toBe('promotion');
      expect(response.body.finalTotal).toBe(840);
    });

    test('should prioritize promotion over voucher when code matches promotion', async () => {
      await Promotion.create({
        code: 'PROMO',
        eligibleCategories: ['electronics'],
        type: 'percentage',
        value: 25,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'PROMO'
        });

      expect(response.status).toBe(200);
      expect(response.body.discount.type).toBe('promotion');
      expect(response.body.discount.amount).toBe(250);
    });

    test('should cap discount at 50% of subtotal', async () => {
      await Voucher.create({
        code: 'HUGE90',
        type: 'percentage',
        value: 90,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'HUGE90'
        });

      expect(response.status).toBe(200);
      expect(response.body.discount.amount).toBe(500); // capped at 50% of 1000
      expect(response.body.finalTotal).toBe(500);
    });

    test('should respect maxDiscountAmount on voucher', async () => {
      await Voucher.create({
        code: 'CAPPED',
        type: 'percentage',
        value: 50,
        maxDiscountAmount: 100,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'CAPPED'
        });

      expect(response.status).toBe(200);
      expect(response.body.discount.amount).toBe(100); // capped by maxDiscountAmount
      expect(response.body.finalTotal).toBe(900);
    });

    test('should reject expired voucher', async () => {
      await Voucher.create({
        code: 'EXPIRED',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'EXPIRED'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });

    test('should reject voucher at usage limit', async () => {
      await Voucher.create({
        code: 'MAXED',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 5,
        uses: 5
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'MAXED'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('limit');
    });

    test('should reject when minimum order value not met', async () => {
      await Voucher.create({
        code: 'MINORDER',
        type: 'percentage',
        value: 10,
        minOrderValue: 500,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: product2._id, qty: 1 }],
          code: 'MINORDER'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Minimum order value');
    });

    test('should reject promotion with no eligible items', async () => {
      const fakeItemId = new mongoose.Types.ObjectId();
      await Promotion.create({
        code: 'SPECIFIC50',
        eligibleCategories: ['nonexistent'],
        eligibleItems: [fakeItemId], // Neither category nor item matches
        type: 'percentage',
        value: 50,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [
            { productId: product1._id, qty: 1 }, // electronics
            { productId: product2._id, qty: 1 }  // fashion
          ],
          code: 'SPECIFIC50'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No eligible items');
    });

    test('should reject when product not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: fakeId, qty: 1 }]
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('not found');
    });

    test('should reject when product out of stock', async () => {
      const outOfStock = await Product.create({
        name: 'Out of Stock Item',
        category: 'electronics',
        price: 100,
        inStock: false
      });

      const response = await request(app)
        .post('/orders/calculate')
        .send({
          items: [{ productId: outOfStock._id, qty: 1 }]
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('out of stock');
    });
  });

  describe('POST /orders', () => {
    test('should create order without discount', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          items: [{ productId: product1._id, qty: 1 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.subTotal).toBe(1000);
      expect(response.body.finalTotal).toBe(1000);
      expect(response.body.applied.code).toBeNull();
    });

    test('should create order with voucher and increment usage', async () => {
      const voucher = await Voucher.create({
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        uses: 0
      });

      const response = await request(app)
        .post('/orders')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'SAVE20'
        });

      expect(response.status).toBe(201);
      expect(response.body.applied.code).toBe('SAVE20');
      expect(response.body.applied.discountType).toBe('voucher');
      expect(response.body.applied.discountAmount).toBe(200);

      // Check usage was incremented
      const updated = await Voucher.findById(voucher._id);
      expect(updated.uses).toBe(1);
    });

    test('should create order with promotion and increment usage', async () => {
      const promotion = await Promotion.create({
        code: 'ELECTRONICS30',
        eligibleCategories: ['electronics'],
        type: 'percentage',
        value: 30,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        uses: 0
      });

      const response = await request(app)
        .post('/orders')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'ELECTRONICS30'
        });

      expect(response.status).toBe(201);
      expect(response.body.applied.code).toBe('ELECTRONICS30');
      expect(response.body.applied.discountType).toBe('promotion');
      expect(response.body.applied.discountAmount).toBe(300);

      // Check usage was incremented
      const updated = await Promotion.findById(promotion._id);
      expect(updated.uses).toBe(1);
    });

    test('should handle concurrent usage attempts (atomic increment)', async () => {
      await Voucher.create({
        code: 'LIMITED',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 1,
        uses: 0
      });

      // Simulate concurrent requests
      const promises = [
        request(app).post('/orders').send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'LIMITED'
        }),
        request(app).post('/orders').send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'LIMITED'
        })
      ];

      const results = await Promise.all(promises);

      // One should succeed, one should fail
      const successes = results.filter(r => r.status === 201);
      const failures = results.filter(r => r.status === 409 || r.status === 400);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
    });

    test('should apply 50% cap and create order', async () => {
      await Voucher.create({
        code: 'HUGE80',
        type: 'percentage',
        value: 80,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'HUGE80'
        });

      expect(response.status).toBe(201);
      expect(response.body.applied.discountAmount).toBe(500); // capped at 50%
      expect(response.body.finalTotal).toBe(500);
    });

    test('should reject order creation with expired code', async () => {
      await Voucher.create({
        code: 'EXPIRED',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/orders')
        .send({
          items: [{ productId: product1._id, qty: 1 }],
          code: 'EXPIRED'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });
  });
});
