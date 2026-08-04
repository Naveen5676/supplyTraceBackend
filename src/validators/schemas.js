import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  category: Joi.string().trim().min(1).max(80).required(),
});

export const createSupplierSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  country: Joi.string().trim().min(1).max(80).required(),
  riskScore: Joi.number().integer().min(0).max(100).required(),
});

export const createPartSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  criticality: Joi.string().valid('low', 'medium', 'high').required(),
  supplierId: Joi.string().trim().min(1).required(),
  productId: Joi.string().trim().min(1).allow(null, '').optional(),
});

export const searchQuerySchema = Joi.object({
  search: Joi.string().trim().allow('').optional().default(''),
});

export const partPathQuerySchema = Joi.object({
  from: Joi.string().trim().min(1).required(),
  to: Joi.string().trim().min(1).required(),
});

export const idParamSchema = Joi.object({
  id: Joi.string().trim().min(1).required(),
});

/** Run Joi in controllers; returns { value } or { error }. */
export function validateValue(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    return {
      error: error.details.map((d) => d.message.replace(/"/g, '')).join('; '),
    };
  }

  return { value };
}
