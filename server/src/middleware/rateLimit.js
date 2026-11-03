// Small in-memory limiter. State resets when the server restarts or sleeps.
function rateLimit({
  windowMs,
  max,
  keyFn,
  code = "RATE_LIMITED",
  message = "Too many requests. Please try again later.",
}) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, Math.max(windowMs, 60000)).unref();

  return function limiter(req, res, next) {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: { code, message } });
    }

    entry.count += 1;
    return next();
  };
}

module.exports = rateLimit;