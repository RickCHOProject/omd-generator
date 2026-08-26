export const getRequestIp = (request) => {
  const forwarded = request?.headers?.get?.('x-forwarded-for') || '';
  return forwarded.split(',')[0].trim() || request?.headers?.get?.('x-real-ip') || 'unknown';
};

export const createRateLimiter = () => {
  const buckets = new Map();
  return ({ key, limit, windowMs, now = Date.now() }) => {
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  };
};

export const publicRateLimit = createRateLimiter();
