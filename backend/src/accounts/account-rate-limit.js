import { isIP } from 'node:net';

export function createAccountRateLimit({ limit = 30, windowMs = 15 * 60 * 1000, maxEntries = 5000, now = Date.now } = {}) {
  const attempts = new Map();
  let nextCleanupAt = 0;

  function reject(response, retryAfterSeconds) {
    response.set('Cache-Control', 'no-store');
    response.set('Retry-After', String(Math.max(1, retryAfterSeconds)));
    return response.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Hiciste demasiados intentos. Espera un momento y vuelve a probar.' },
    });
  }

  return function accountRateLimit(request, response, next) {
    const timestamp = now();
    if (timestamp >= nextCleanupAt) {
      for (const [key, entry] of attempts) {
        if (entry.startedAt + windowMs <= timestamp) attempts.delete(key);
      }
      nextCleanupAt = timestamp + Math.min(windowMs, 60_000);
    }

    const forwardedClientIp = request.get?.('x-real-ip');
    const clientIp = typeof forwardedClientIp === 'string' && isIP(forwardedClientIp)
      ? forwardedClientIp
      : request.ip || request.socket?.remoteAddress || 'unknown';
    const key = `${clientIp}:${request.path}`;
    const entry = attempts.get(key);
    if (!entry && attempts.size >= maxEntries) return reject(response, Math.ceil(Math.min(windowMs, 60_000) / 1000));
    if (!entry || entry.startedAt + windowMs <= timestamp) {
      attempts.set(key, { startedAt: timestamp, count: 1 });
      return next();
    }
    if (entry.count >= limit) {
      return reject(response, Math.ceil((entry.startedAt + windowMs - timestamp) / 1000));
    }
    entry.count += 1;
    return next();
  };
}
