const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Promotion = require('../src/models/promotion.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voucher-api-test';

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Promotion.deleteMany({});
});

describe('Promotion API', () => {
  describe('POST /promotions', () => {
    test('should create a promotion with eligible categories', async () => {
      const promotionData = {
        code: 'ELECTRONICS25',
        eligibleCategories: ['electronics', 'computers'],
        type: 'percentage',
        value: 25,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 200
      };

      const response = await request(app)
        .post('/promotions')
        .send(promotionData);

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('ELECTRONICS25');
      expect(response.body.eligibleCategories).toEqual(['electronics', 'computers']);
      expect(response.body.uses).toBe(0);
    });

    test('should create a promotion with eligible items', async () => {
      const itemId = new mongoose.Types.ObjectId();
      const promotionData = {
        code: 'ITEM50',
        eligibleItems: [itemId],
        type: 'fixed',
        value: 50,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      };

      const response = await request(app)
        .post('/promotions')
        .send(promotionData);

      expect(response.status).toBe(201);
      expect(response.body.eligibleItems).toHaveLength(1);
    });

    test('should auto-generate code if not provided', async () => {
      const promotionData = {
        eligibleCategories: ['fashion'],
        type: 'percentage',
        value: 15,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 150
      };

      const response = await request(app)
        .post('/promotions')
        .send(promotionData);

      expect(response.status).toBe(201);
      expect(response.body.code).toBeDefined();
      expect(response.body.code.length).toBe(10);
    });

    test('should reject duplicate promotion code', async () => {
      await Promotion.create({
        code: 'DUPLICATE',
        eligibleCategories: ['books'],
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .post('/promotions')
        .send({
          code: 'DUPLICATE',
          eligibleCategories: ['electronics'],
          type: 'fixed',
          value: 20,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 50
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    test('should create promotion with maxDiscountAmount', async () => {
      const promotionData = {
        code: 'CAPPED',
        eligibleCategories: ['electronics'],
        type: 'percentage',
        value: 50,
        maxDiscountAmount: 100,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      };

      const response = await request(app)
        .post('/promotions')
        .send(promotionData);

      expect(response.status).toBe(201);
      expect(response.body.maxDiscountAmount).toBe(100);
    });
  });

  describe('GET /promotions', () => {
    beforeEach(async () => {
      await Promotion.create([
        {
          code: 'ACTIVE1',
          eligibleCategories: ['electronics'],
          type: 'percentage',
          value: 20,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 100,
          uses: 10
        },
        {
          code: 'EXPIRED1',
          eligibleCategories: ['fashion'],
          type: 'fixed',
          value: 30,
          expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          usageLimit: 50,
          uses: 5
        },
        {
          code: 'DELETED1',
          eligibleCategories: ['books'],
          type: 'percentage',
          value: 15,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 100,
          uses: 0,
          deletedAt: new Date()
        }
      ]);
    });

    test('should get all promotions', async () => {
      const response = await request(app).get('/promotions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter active promotions', async () => {
      const response = await request(app).get('/promotions?status=active');

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every(p => new Date(p.expiresAt) > new Date())).toBe(true);
    });

    test('should filter expired promotions', async () => {
      const response = await request(app).get('/promotions?status=expired');

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every(p => new Date(p.expiresAt) <= new Date())).toBe(true);
    });

    test('should filter deleted promotions', async () => {
      const response = await request(app).get('/promotions?status=deleted');

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every(p => p.deletedAt !== null)).toBe(true);
    });
  });

  describe('GET /promotions/:code', () => {
    test('should get promotion by code', async () => {
      await Promotion.create({
        code: 'FINDME',
        eligibleCategories: ['electronics'],
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app).get('/promotions/FINDME');

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('FINDME');
    });

    test('should return 404 for non-existent promotion', async () => {
      const response = await request(app).get('/promotions/NOTFOUND');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    test('should not find deleted promotion', async () => {
      await Promotion.create({
        code: 'DELETED',
        eligibleCategories: ['books'],
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        deletedAt: new Date()
      });

      const response = await request(app).get('/promotions/DELETED');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /promotions/:id', () => {
    test('should update promotion', async () => {
      const promotion = await Promotion.create({
        code: 'UPDATE',
        eligibleCategories: ['electronics'],
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app)
        .put(`/promotions/${promotion._id}`)
        .send({ value: 30 });

      expect(response.status).toBe(200);
      expect(response.body.value).toBe(30);
    });

    test('should return 404 for non-existent promotion', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/promotions/${fakeId}`)
        .send({ value: 25 });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /promotions/:id', () => {
    test('should soft delete promotion', async () => {
      const promotion = await Promotion.create({
        code: 'DELETE',
        eligibleCategories: ['fashion'],
        type: 'percentage',
        value: 15,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const response = await request(app).delete(`/promotions/${promotion._id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      const deleted = await Promotion.findById(promotion._id);
      expect(deleted.deletedAt).not.toBeNull();
    });

    test('should return 404 for non-existent promotion', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).delete(`/promotions/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });
});
