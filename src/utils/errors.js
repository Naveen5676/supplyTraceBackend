/** Shared DB / HTTP error helpers. */

/** Success: { success: true, code, result } */
export function sendSuccess(res, result, code = 200) {
  return res.status(code).json({
    success: true,
    code,
    result,
  });
}

/** Error: { success: false, code, error, message } */
export function sendFail(res, code, error, message) {
  return res.status(code).json({
    success: false,
    code,
    error,
    message,
  });
}

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
        success: false,
        code: 401,
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
        success: false,
        code: 503,
        error: 'database_unreachable',
        message: 'Database unreachable. Verify CognoDB connection settings.',
      },
    };
  }
  return {
    status: 500,
    body: {
      success: false,
      code: 500,
      error: 'internal_error',
      message: fallback,
    },
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
    return sendFail(res, 404, 'not_found', err.message);
  }
  console.error(logLabel, err.code || '', err.message);
  const fail = dbFailResponse(err, fallback);
  return res.status(fail.status).json(fail.body);
}
