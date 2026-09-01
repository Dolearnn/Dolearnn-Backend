import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/http';

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Evict expired buckets so the map doesn't grow unbounded under sustained traffic.
const SWEEP_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref();

function clientKey(req: Request) {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.ip || 'unknown';
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${options.keyPrefix}:${clientKey(req)}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (current.count >= options.max) {
      return next(new AppError(429, options.message));
    }

    current.count += 1;
    buckets.set(key, current);
    return next();
  };
}
