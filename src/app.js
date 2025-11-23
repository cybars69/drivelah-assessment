const express = require('express');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const voucherRoutes = require('./routes/vouchers');
const promotionRoutes = require('./routes/promotions');
const orderRoutes = require('./routes/orders');
const productRoutes = require('./routes/products');

const app = express();

// Middleware
app.use(express.json());
app.use(morgan('common'))

// Rate limiting (in-memory for dev)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

app.use(limiter);

// Routes
app.use('/vouchers', voucherRoutes);
app.use('/promotions', promotionRoutes);
app.use('/orders', orderRoutes);
app.use('/products', productRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
