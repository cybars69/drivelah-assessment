const express = require('express');
const router = express.Router();
const promotionService = require('../services/promotion.service');
const { createPromotionSchema, updatePromotionSchema } = require('../validators/promotion.validator');

router.post('/', async (req, res) => {
  try {
    const { error, value } = createPromotionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const promotion = await promotionService.create(value);
    res.status(201).json(promotion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const promotions = await promotionService.findAll(req.query);
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const promotion = await promotionService.findByCode(req.params.code);
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.json(promotion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updatePromotionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const promotion = await promotionService.update(req.params.id, value);
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.json(promotion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const promotion = await promotionService.delete(req.params.id);
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.json({ message: 'Promotion deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
