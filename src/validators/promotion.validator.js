const Joi = require('joi');

const createPromotionSchema = Joi.object({
  code: Joi.string().optional().uppercase().trim(),
  eligibleCategories: Joi.array().items(Joi.string()).default([]),
  eligibleItems: Joi.array().items(Joi.string().hex().length(24)).default([]),
  type: Joi.string().valid('percentage', 'fixed').required(),
  value: Joi.number().min(0).required(),
  expiresAt: Joi.date().iso().required(),
  usageLimit: Joi.number().integer().min(1).required(),
  minOrderValue: Joi.number().min(0).optional(),
  maxDiscountAmount: Joi.number().min(0).optional()
}).custom((value) => {
  if (value.type === 'percentage' && value.value > 50) {
    value.value = 50;
  }
  return value;
});

const updatePromotionSchema = Joi.object({
  code: Joi.string().uppercase().trim(),
  eligibleCategories: Joi.array().items(Joi.string()),
  eligibleItems: Joi.array().items(Joi.string().hex().length(24)),
  type: Joi.string().valid('percentage', 'fixed'),
  value: Joi.number().min(0),
  expiresAt: Joi.date().iso(),
  usageLimit: Joi.number().integer().min(1),
  minOrderValue: Joi.number().min(0).allow(null),
  maxDiscountAmount: Joi.number().min(0).allow(null)
}).min(1).custom((value) => {
  if (value.type === 'percentage' && value.value > 50) {
    value.value = 50;
  }
  return value;
});

module.exports = {
  createPromotionSchema,
  updatePromotionSchema
};
