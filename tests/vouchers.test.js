const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Voucher = require('../src/models/voucher.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voucher-api-test';

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Voucher.deleteMany({});
});

describe('Voucher API', () => {
  describe('POST /vouchers', () => {
    test('should create a voucher with all fields', async () => {
      const voucherData = {
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        minOrderValue: 50,
        maxDiscountAmount: 100
      };

      const response = await request(app)
        .post('/vouchers')
        .send(voucherData);

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('SAVE20');
      expect(response.body.type).toBe('percentage');
      expect(response.body.value).toBe(20);
      expect(response.body.uses).toBe(0);
    });

    test('should auto-generate code if not provided', async () => {
      const voucherData = {
        type: 'fixed',
        value: 50,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 50
      };

      const response = await request(app)
        .post('/vouchers')
        .send(voucherData);

      expect(response.status).toBe(201);
      expect(response.body.code).toBeDefined();
      expect(response.body.code.length).toBe(10);
    });

    test('should reject duplicate voucher code', async () => {
      await Voucher.create({
        code: 'DUPLICATE',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/vouchers')
        .send({
          code: 'DUPLICATE',
          type: 'fixed',
          value: 20,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 50
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    test('should reject invalid voucher type', async () => {
      const response = await request(app)
        .post('/vouchers')
        .send({
          code: 'INVALID',
          type: 'invalid_type',
          value: 20,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 100
        });

      expect(response.status).toBe(400);
    });

    test('should reject negative value', async () => {
      const response = await request(app)
        .post('/vouchers')
        .send({
          code: 'NEGATIVE',
          type: 'percentage',
          value: -10,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 100
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /vouchers', () => {
    beforeEach(async () => {
      await Voucher.create([
        {
          code: 'ACTIVE1',
          type: 'percentage',
          value: 10,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 100,
          uses: 5
        },
        {
          code: 'EXPIRED1',
          type: 'fixed',
          value: 50,
          expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          usageLimit: 100,
          uses: 10
        },
        {
          code: 'DELETED1',
          type: 'percentage',
          value: 15,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 100,
          uses: 0,
          deletedAt: new Date()
        }
      ]);
    });

    test('should get all vouchers', async () => {
      const response = await request(app).get('/vouchers');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter active vouchers', async () => {
      const response = await request(app).get('/vouchers?status=active');

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every(v => new Date(v.expiresAt) > new Date())).toBe(true);
    });

    test('should filter expired vouchers', async () => {
      const response = await request(app).get('/vouchers?status=expired');

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every(v => new Date(v.expiresAt) <= new Date())).toBe(true);
    });

    test('should filter deleted vouchers', async () => {
      const response = await request(app).get('/vouchers?status=deleted');

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every(v => v.deletedAt !== null)).toBe(true);
    });
  });

  describe('GET /vouchers/:code', () => {
    test('should get voucher by code', async () => {
      await Voucher.create({
        code: 'FINDME',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app).get('/vouchers/FINDME');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('FINDME');
    });

    test('should return 404 for non-existent voucher', async () => {
      const response = await request(app).get('/vouchers/NOTFOUND');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    test('should not find deleted voucher', async () => {
      await Voucher.create({
        code: 'DELETED',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        deletedAt: new Date()
      });

      const response = await request(app).get('/vouchers/DELETED');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /vouchers/:id', () => {
    test('should update voucher', async () => {
      const voucher = await Voucher.create({
        code: 'UPDATE',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .put(`/vouchers/${voucher._id}`)
        .send({ value: 20 });

      expect(response.status).toBe(200);
      expect(response.body.value).toBe(20);
    });

    test('should return 404 for non-existent voucher', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/vouchers/${fakeId}`)
        .send({ value: 20 });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /vouchers/:id', () => {
    test('should soft delete voucher', async () => {
      const voucher = await Voucher.create({
        code: 'DELETE',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app).delete(`/vouchers/${voucher._id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      const deleted = await Voucher.findById(voucher._id);
      expect(deleted.deletedAt).not.toBeNull();
    });

    test('should return 404 for non-existent voucher', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).delete(`/vouchers/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });
});
