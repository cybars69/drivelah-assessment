const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Voucher = require('../src/models/voucher.model');
const Promotion = require('../src/models/promotion.model');

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
});

describe('POST /orders/apply', () => {
  const sampleItems = [
    { productId: '507f1f77bcf86cd799439011', category: 'electronics', price: 100, qty: 2 },
    { productId: '507f1f77bcf86cd799439012', category: 'fashion', price: 50, qty: 1 }
  ];

  test('should calculate subtotal without discounts', async () => {
    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems });

    expect(response.status).toBe(200);
    expect(response.body.subTotal).toBe(250);
    expect(response.body.finalTotal).toBe(250);
    expect(response.body.discounts).toHaveLength(0);
  });

  test('should apply valid percentage voucher', async () => {
    await Voucher.create({
      code: 'SAVE10',
      type: 'percentage',
      value: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, voucherCode: 'SAVE10' });

    expect(response.status).toBe(200);
    expect(response.body.subTotal).toBe(250);
    expect(response.body.totalDiscount).toBe(25);
    expect(response.body.finalTotal).toBe(225);
  });

  test('should apply valid fixed voucher', async () => {
    await Voucher.create({
      code: 'FLAT50',
      type: 'fixed',
      value: 50,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, voucherCode: 'FLAT50' });

    expect(response.status).toBe(200);
    expect(response.body.totalDiscount).toBe(50);
    expect(response.body.finalTotal).toBe(200);
  });

  test('should reject expired voucher', async () => {
    await Voucher.create({
      code: 'EXPIRED',
      type: 'percentage',
      value: 10,
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, voucherCode: 'EXPIRED' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('expired');
  });

  test('should reject voucher when usage limit reached', async () => {
    await Voucher.create({
      code: 'LIMITED',
      type: 'percentage',
      value: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 5,
      uses: 5
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, voucherCode: 'LIMITED' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('limit');
  });

  test('should reject voucher when minimum order value not met', async () => {
    await Voucher.create({
      code: 'MINORDER',
      type: 'percentage',
      value: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0,
      minOrderValue: 500
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, voucherCode: 'MINORDER' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Minimum order value');
  });

  test('should apply promotion to eligible categories', async () => {
    await Promotion.create({
      code: 'ELECTRONICS20',
      eligibleCategories: ['electronics'],
      eligibleItems: [],
      type: 'percentage',
      value: 20,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, promotionCode: 'ELECTRONICS20' });

    expect(response.status).toBe(200);
    expect(response.body.totalDiscount).toBe(40); // 20% of 200 (electronics only)
    expect(response.body.finalTotal).toBe(210);
  });

  test('should reject promotion when no eligible items', async () => {
    await Promotion.create({
      code: 'BOOKS50',
      eligibleCategories: ['books'],
      eligibleItems: [],
      type: 'percentage',
      value: 50,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, promotionCode: 'BOOKS50' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('No eligible items');
  });

  test('should cap total discount at 50% of subtotal', async () => {
    await Voucher.create({
      code: 'HUGE',
      type: 'percentage',
      value: 80,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, voucherCode: 'HUGE' });

    expect(response.status).toBe(200);
    expect(response.body.totalDiscount).toBe(125); // capped at 50% of 250
    expect(response.body.finalTotal).toBe(125);
  });

  test('should prevent using same code as voucher and promotion', async () => {
    await Voucher.create({
      code: 'SAME',
      type: 'percentage',
      value: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0
    });

    const response = await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, voucherCode: 'SAME', promotionCode: 'SAME' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('same code');
  });

  test('should increment usage count after successful application', async () => {
    const voucher = await Voucher.create({
      code: 'INCREMENT',
      type: 'percentage',
      value: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      uses: 0
    });

    await request(app)
      .post('/orders/apply')
      .send({ items: sampleItems, voucherCode: 'INCREMENT' });

    const updated = await Voucher.findById(voucher._id);
    expect(updated.uses).toBe(1);
  });
});
