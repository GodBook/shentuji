type Entry = { attempts: number[] };

const buckets = new Map<string, Entry>();

export function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const cutoff = now - options.windowMs;
  const entry = buckets.get(key) ?? { attempts: [] };
  entry.attempts = entry.attempts.filter((attempt) => attempt > cutoff);

  if (entry.attempts.length >= options.limit) {
    const retryAfterMs = entry.attempts[0] + options.windowMs - now;
    return { allowed: false, retryAfterMs };
  }

  entry.attempts.push(now);
  buckets.set(key, entry);
  return { allowed: true, retryAfterMs: 0 };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
