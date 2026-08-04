import { withSession } from '../utils/db.js';
import { makeId, toNumber, sendDbError } from '../utils/errors.js';
import {
  LIST_SUPPLIERS,
  SUPPLIER_IMPACT,
  SUPPLIER_EXISTS,
  PART_DEPENDENCY_PATHS,
  CREATE_SUPPLIER,
} from '../utils/queries.js';
import {
  createSupplierSchema,
  searchQuerySchema,
  partPathQuerySchema,
  idParamSchema,
  validateValue,
} from '../validators/schemas.js';

const CRIT_WEIGHT = { high: 3, medium: 2, low: 1 };

export async function listSuppliers(req, res) {
  const parsed = validateValue(searchQuerySchema, req.query);
  if (parsed.error) {
    return res.status(400).json({ error: 'bad_request', message: parsed.error });
  }
  const { search } = parsed.value;

  try {
    const suppliers = await withSession(async (session) => {
      const result = await session.run(LIST_SUPPLIERS, { search });
      return result.records.map((r) => ({
        id: r.get('id'),
        name: r.get('name'),
        country: r.get('country'),
        riskScore: toNumber(r.get('riskScore')),
      }));
    });
    res.json({ suppliers });
  } catch (err) {
    sendDbError(res, err, 'Failed to list suppliers.', '[suppliers]');
  }
}

export async function createSupplier(req, res) {
  const parsed = validateValue(createSupplierSchema, req.body);
  if (parsed.error) {
    return res.status(400).json({ error: 'bad_request', message: parsed.error });
  }
  const { name, country, riskScore } = parsed.value;
  const id = makeId('sup');

  try {
    const supplier = await withSession(async (session) => {
      const result = await session.run(CREATE_SUPPLIER, {
        id,
        name,
        country,
        riskScore,
      });
      const r = result.records[0];
      return {
        id: r.get('id'),
        name: r.get('name'),
        country: r.get('country'),
        riskScore: toNumber(r.get('riskScore')),
      };
    });
    res.status(201).json({ supplier });
  } catch (err) {
    sendDbError(res, err, 'Failed to create supplier.', '[suppliers POST]');
  }
}

export async function getSupplierImpact(req, res) {
  const parsed = validateValue(idParamSchema, req.params);
  if (parsed.error) {
    return res.status(400).json({ error: 'bad_request', message: parsed.error });
  }
  const supplierId = parsed.value.id;

  try {
    const impact = await withSession(async (session) => {
      const exists = await session.run(SUPPLIER_EXISTS, { supplierId });
      if (exists.records.length === 0) return null;

      const result = await session.run(SUPPLIER_IMPACT, { supplierId });
      if (result.records.length === 0) {
        const s = exists.records[0];
        return {
          supplier: {
            id: s.get('id'),
            name: s.get('name'),
            country: s.get('country'),
            riskScore: toNumber(s.get('riskScore')),
          },
          affectedParts: [],
          affectedProducts: [],
          rankedProducts: [],
        };
      }

      const first = result.records[0];
      const partsMap = new Map();
      const productsMap = new Map();

      for (const r of result.records) {
        const partId = r.get('partId');
        if (partId) {
          partsMap.set(partId, {
            id: partId,
            name: r.get('partName'),
            criticality: r.get('partCriticality'),
          });
        }

        const productId = r.get('productId');
        if (productId) {
          const hops = toNumber(r.get('hops'));
          const crit = r.get('partCriticality') || 'low';
          const weight = CRIT_WEIGHT[crit] || 1;
          const existing = productsMap.get(productId) || {
            id: productId,
            name: r.get('productName'),
            category: r.get('productCategory'),
            minHops: hops == null ? 0 : hops,
            maxCriticality: weight,
            viaParts: [],
          };

          if (hops != null && hops < existing.minHops) existing.minHops = hops;
          if (weight > existing.maxCriticality) existing.maxCriticality = weight;

          const partName = r.get('partName');
          if (partName && !existing.viaParts.includes(partName)) {
            existing.viaParts.push(partName);
          }

          productsMap.set(productId, existing);
        }
      }

      const rankedProducts = Array.from(productsMap.values()).sort((a, b) => {
        if (b.maxCriticality !== a.maxCriticality) {
          return b.maxCriticality - a.maxCriticality;
        }
        if (a.minHops !== b.minHops) return a.minHops - b.minHops;
        return a.name.localeCompare(b.name);
      });

      return {
        supplier: {
          id: first.get('supplierId'),
          name: first.get('supplierName'),
          country: first.get('country'),
          riskScore: toNumber(first.get('riskScore')),
        },
        affectedParts: Array.from(partsMap.values()),
        affectedProducts: rankedProducts.map(({ id, name, category }) => ({
          id,
          name,
          category,
        })),
        rankedProducts,
      };
    });

    if (!impact) {
      return res.status(404).json({ error: 'not_found', message: 'Supplier not found.' });
    }
    res.json({ impact });
  } catch (err) {
    sendDbError(res, err, 'Failed to compute supplier impact.', '[suppliers/:id/impact]');
  }
}

export async function getPartDependencyPaths(req, res) {
  const parsed = validateValue(partPathQuerySchema, req.query);
  if (parsed.error) {
    return res.status(400).json({ error: 'bad_request', message: parsed.error });
  }
  const { from: fromPartId, to: toPartId } = parsed.value;

  try {
    const paths = await withSession(async (session) => {
      const result = await session.run(PART_DEPENDENCY_PATHS, { fromPartId, toPartId });
      if (result.records.length === 0) return [];
      const hops = toNumber(result.records[0].get('hops'));
      const nodes = result.records.map((r) => ({
        id: r.get('id'),
        name: r.get('name'),
        criticality: r.get('criticality'),
      }));
      return [{ nodes, hops }];
    });
    res.json({ fromPartId, toPartId, paths });
  } catch (err) {
    sendDbError(res, err, 'Failed to find dependency paths.', '[paths/parts]');
  }
}
