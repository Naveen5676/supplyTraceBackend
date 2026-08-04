/** Shared DB / HTTP error helpers. */

export function isUnauthorized(err) {
  return (
    err.code === 'Neo.ClientError.Security.Unauthorized' ||
    /authentication failure|unauthorized/i.test(err.message || '')
  );
}

export function isDbError(err) {
  return (
    isUnauthorized(err) ||
    err.code === 'ServiceUnavailable' ||
    err.name === 'Neo4jError' ||
    /ECONNREFUSED|ENOTFOUND|unreachable|not configured/i.test(err.message || '')
  );
}

export function dbFailResponse(err, fallback) {
  if (isUnauthorized(err)) {
    return {
      status: 401,
      body: {
        error: 'database_unauthorized',
        message:
          'CognoDB rejected the username/password. Update NEO4J_PASSWORD in .env.',
      },
    };
  }
  if (isDbError(err)) {
    return {
      status: 503,
      body: {
        error: 'database_unreachable',
        message: 'Database unreachable. Verify CognoDB connection settings.',
      },
    };
  }
  return {
    status: 500,
    body: { error: 'internal_error', message: fallback },
  };
}

export function toNumber(value) {
  if (value == null) return value;
  if (typeof value?.toNumber === 'function') return value.toNumber();
  return value;
}

export function makeId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function sendDbError(res, err, fallback, logLabel = '[api]') {
  if (err.status === 404) {
    return res.status(404).json({ error: 'not_found', message: err.message });
  }
  console.error(logLabel, err.code || '', err.message);
  const fail = dbFailResponse(err, fallback);
  return res.status(fail.status).json(fail.body);
}
