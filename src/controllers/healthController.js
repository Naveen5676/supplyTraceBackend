import { verifyConnectivity, withSession } from '../utils/db.js';
import { PING } from '../utils/queries.js';
import { isUnauthorized, sendSuccess, sendFail } from '../utils/errors.js';

export async function getHealth(_req, res) {
  try {
    await verifyConnectivity();
    await withSession((session) => session.run(PING));
    sendSuccess(res, { status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('[health]', err.code || '', err.message);
    const unauthorized = isUnauthorized(err);
    sendFail(
      res,
      unauthorized ? 401 : 503,
      unauthorized ? 'database_unauthorized' : 'database_unreachable',
      unauthorized
        ? 'CognoDB rejected the username/password. Update NEO4J_PASSWORD in .env (copy it exactly from the CognoDB console).'
        : 'CognoDB is unreachable. Check NEO4J_URI and network, then retry.'
    );
  }
}
