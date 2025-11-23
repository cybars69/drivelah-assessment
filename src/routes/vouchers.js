const express = require('express');
const router = express.Router();
const voucherService = require('../services/voucher.service');
const { createVoucherSchema, updateVoucherSchema } = require('../validators/voucher.validator');

router.post('/', async (req, res) => {
  try {
    const { error, value } = createVoucherSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const voucher = await voucherService.create(value);
    res.status(201).json(voucher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const vouchers = await voucherService.findAll(req.query);
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const voucher = await voucherService.findByCode(req.params.code);
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateVoucherSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const voucher = await voucherService.update(req.params.id, value);
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    res.json(voucher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const voucher = await voucherService.delete(req.params.id);
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    res.json({ message: 'Voucher deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
