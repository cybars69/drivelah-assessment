const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Product = require('../src/models/product.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voucher-api-test';

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Product.deleteMany({});
});

describe('Product API', () => {
  describe('GET /products', () => {
    test('should get all in-stock products', async () => {
      await Product.create([
        {
          name: 'Laptop',
          category: 'electronics',
          price: 1000,
          description: 'High-end laptop',
          inStock: true
        },
        {
          name: 'Phone',
          category: 'electronics',
          price: 500,
          inStock: true
        },
        {
          name: 'Out of Stock Item',
          category: 'electronics',
          price: 200,
          inStock: false
        }
      ]);

      const response = await request(app).get('/products');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body.every(p => p.inStock === true)).toBe(true);
    });

    test('should return empty array when no products', async () => {
      const response = await request(app).get('/products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /products/:id', () => {
    test('should get product by id', async () => {
      const product = await Product.create({
        name: 'Laptop',
        category: 'electronics',
        price: 1000,
        description: 'High-end laptop',
        inStock: true
      });

      const response = await request(app).get(`/products/${product._id}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Laptop');
      expect(response.body.category).toBe('electronics');
      expect(response.body.price).toBe(1000);
    });

    test('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/products/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    test('should return out of stock product', async () => {
      const product = await Product.create({
        name: 'Out of Stock',
        category: 'electronics',
        price: 100,
        inStock: false
      });

      const response = await request(app).get(`/products/${product._id}`);

      expect(response.status).toBe(200);
      expect(response.body.inStock).toBe(false);
    });
  });
});
