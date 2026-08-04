import { verifyConnectivity, withSession } from '../utils/db.js';
import { PING } from '../utils/queries.js';
import { isUnauthorized } from '../utils/errors.js';

export async function getHealth(_req, res) {
  try {
    await verifyConnectivity();
    await withSession((session) => session.run(PING));
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('[health]', err.code || '', err.message);
    const unauthorized = isUnauthorized(err);
    res.status(unauthorized ? 401 : 503).json({
      status: 'error',
      database: unauthorized ? 'unauthorized' : 'unreachable',
      message: unauthorized
        ? 'CognoDB rejected the username/password. Update NEO4J_PASSWORD in .env (copy it exactly from the CognoDB console).'
        : 'CognoDB is unreachable. Check NEO4J_URI and network, then retry.',
    });
  }
}
