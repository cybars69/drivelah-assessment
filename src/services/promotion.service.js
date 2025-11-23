const Promotion = require('../models/promotion.model');

class PromotionService {
  generateCode(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async create(data) {
    try {
      // Generate code if not provided
      if (!data.code) {
        let codeGenerated = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!codeGenerated && attempts < maxAttempts) {
          data.code = this.generateCode();
          const existing = await Promotion.findOne({ code: data.code, deletedAt: null });
          if (!existing) {
            codeGenerated = true;
          }
          attempts++;
        }

        if (!codeGenerated) {
          throw new Error('Failed to generate unique promotion code');
        }
      }

      const promotion = new Promotion(data);
      return await promotion.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('Promotion code already exists');
      }
      throw error;
    }
  }

  async findAll(query = {}) {
    const filter = {};

    // Filter by status: active, expired, or deleted
    if (query.status === 'deleted') {
      filter.deletedAt = { $ne: null };
    } else if (query.status === 'active') {
      filter.expiresAt = { $gt: new Date() };
      filter.$expr = { $lt: ['$uses', '$usageLimit'] };
    } else if (query.status === 'expired') {
      filter.expiresAt = { $lte: new Date() };
    }

    return await Promotion.find(filter).sort({ createdAt: -1 });
  }

  async findByCode(code) {
    return await Promotion.findOne({ code: code.toUpperCase(), deletedAt: null });
  }

  async findById(id) {
    return await Promotion.findOne({ _id: id, deletedAt: null });
  }

  async update(id, data) {
    try {
      return await Promotion.findOneAndUpdate(
        { _id: id, deletedAt: null },
        data,
        { new: true, runValidators: true }
      );
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('Promotion code already exists');
      }
      throw error;
    }
  }

  async delete(id) {
    return await Promotion.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
  }

  async incrementUse(id, currentUses, usageLimit) {
    return await Promotion.findOneAndUpdate(
      { _id: id, uses: currentUses, deletedAt: null, $expr: { $lt: ['$uses', '$usageLimit'] } },
      { $inc: { uses: 1 } },
      { new: true }
    );
  }
}

module.exports = new PromotionService();
