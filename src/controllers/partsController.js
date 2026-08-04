import { withSession } from '../utils/db.js';
import { makeId, sendDbError } from '../utils/errors.js';
import { CREATE_PART, LINK_PART_TO_PRODUCT } from '../utils/queries.js';
import { createPartSchema, validateValue } from '../validators/schemas.js';

export async function createPart(req, res) {
  const parsed = validateValue(createPartSchema, req.body);
  if (parsed.error) {
    return res.status(400).json({ error: 'bad_request', message: parsed.error });
  }

  const { name, criticality, supplierId } = parsed.value;
  const productId =
    typeof parsed.value.productId === 'string' && parsed.value.productId.trim()
      ? parsed.value.productId.trim()
      : null;
  const id = makeId('part');

  try {
    const part = await withSession(async (session) => {
      const created = await session.run(CREATE_PART, {
        id,
        name,
        criticality,
        supplierId,
      });

      if (created.records.length === 0) {
        const err = new Error('Supplier not found.');
        err.status = 404;
        throw err;
      }

      const r = created.records[0];
      const result = {
        id: r.get('id'),
        name: r.get('name'),
        criticality: r.get('criticality'),
        supplierId: r.get('supplierId'),
        supplierName: r.get('supplierName'),
        productId: null,
        productName: null,
      };

      if (productId) {
        const linked = await session.run(LINK_PART_TO_PRODUCT, {
          productId,
          partId: id,
        });
        if (linked.records.length === 0) {
          const err = new Error('Product not found.');
          err.status = 404;
          throw err;
        }
        result.productId = linked.records[0].get('productId');
        result.productName = linked.records[0].get('productName');
      }

      return result;
    });

    res.status(201).json({ part });
  } catch (err) {
    sendDbError(res, err, 'Failed to create part.', '[parts POST]');
  }
}
