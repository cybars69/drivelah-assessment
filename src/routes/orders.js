const express = require('express');
const router = express.Router();
const orderService = require('../services/order.service');
const { orderSchema } = require('../validators/order.validator');

// Calculate order with prices and discounts (without saving to DB)
router.post('/calculate', async (req, res) => {
  try {
    const { error, value } = orderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await orderService.calculateOrder(value);
    res.json(result);
  } catch (err) {
    const statusCode = err.message.includes('expired') || err.message.includes('limit reached') || err.message.includes('not met') || err.message.includes('No eligible') ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// Create order and save to DB
router.post('/', async (req, res) => {
  try {
    const { error, value } = orderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const order = await orderService.createOrder(value);
    res.status(201).json(order);
  } catch (err) {
    const statusCode = err.message.includes('expired') || err.message.includes('limit reached') || err.message.includes('not met') || err.message.includes('No eligible') ? 400 :
                       err.message.includes('concurrent') ? 409 : 500;
    res.status(statusCode).json({ error: err.message });
  }
});

module.exports = router;
