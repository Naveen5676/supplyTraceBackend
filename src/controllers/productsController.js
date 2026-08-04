import { withSession } from '../utils/db.js';
import { makeId, toNumber, sendDbError } from '../utils/errors.js';
import {
  LIST_PRODUCTS,
  PRODUCT_DETAIL,
  CREATE_PRODUCT,
} from '../utils/queries.js';
import {
  createProductSchema,
  searchQuerySchema,
  idParamSchema,
  validateValue,
} from '../validators/schemas.js';

export async function listProducts(req, res) {
  const parsed = validateValue(searchQuerySchema, req.query);
  if (parsed.error) {
    return res.status(400).json({ error: 'bad_request', message: parsed.error });
  }
  const { search } = parsed.value;

  try {
    const products = await withSession(async (session) => {
      const result = await session.run(LIST_PRODUCTS, { search });
      return result.records.map((r) => ({
        id: r.get('id'),
        name: r.get('name'),
        category: r.get('category'),
      }));
    });
    res.json({ products });
  } catch (err) {
    sendDbError(res, err, 'Failed to list products.', '[products]');
  }
}

export async function createProduct(req, res) {
  const parsed = validateValue(createProductSchema, req.body);
  if (parsed.error) {
    return res.status(400).json({ error: 'bad_request', message: parsed.error });
  }
  const { name, category } = parsed.value;
  const id = makeId('prod');

  try {
    const product = await withSession(async (session) => {
      const result = await session.run(CREATE_PRODUCT, { id, name, category });
      const r = result.records[0];
      return {
        id: r.get('id'),
        name: r.get('name'),
        category: r.get('category'),
      };
    });
    res.status(201).json({ product });
  } catch (err) {
    sendDbError(res, err, 'Failed to create product.', '[products POST]');
  }
}

export async function getProduct(req, res) {
  const parsed = validateValue(idParamSchema, req.params);
  if (parsed.error) {
    return res.status(400).json({ error: 'bad_request', message: parsed.error });
  }
  const productId = parsed.value.id;

  try {
    const product = await withSession(async (session) => {
      const result = await session.run(PRODUCT_DETAIL, { productId });
      if (result.records.length === 0) return null;

      const first = result.records[0];
      const byId = new Map();

      for (const r of result.records) {
        const partId = r.get('partId');
        if (!partId) continue;

        const existing = byId.get(partId) || {
          id: partId,
          name: r.get('partName'),
          criticality: r.get('partCriticality'),
          supplier: null,
          dependsOn: [],
        };

        if (r.get('supplierId')) {
          existing.supplier = {
            id: r.get('supplierId'),
            name: r.get('supplierName'),
            country: r.get('supplierCountry'),
            riskScore: toNumber(r.get('supplierRiskScore')),
          };
        }

        const depId = r.get('depId');
        if (depId && !existing.dependsOn.some((d) => d.id === depId)) {
          existing.dependsOn.push({
            id: depId,
            name: r.get('depName'),
            criticality: r.get('depCriticality'),
          });
        }

        byId.set(partId, existing);
      }

      return {
        id: first.get('id'),
        name: first.get('name'),
        category: first.get('category'),
        parts: Array.from(byId.values()),
      };
    });

    if (!product) {
      return res.status(404).json({ error: 'not_found', message: 'Product not found.' });
    }
    res.json({ product });
  } catch (err) {
    sendDbError(res, err, 'Failed to load product.', '[products/:id]');
  }
}
