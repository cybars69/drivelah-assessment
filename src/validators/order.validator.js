const Joi = require('joi');

const orderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().hex().length(24).required(),
        qty: Joi.number().integer().min(1).required()
      })
    )
    .min(1)
    .required(),
  code: Joi.string().uppercase().trim().optional()
});

module.exports = {
  orderSchema
};
