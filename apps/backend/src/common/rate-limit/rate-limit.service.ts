import { Injectable } from '@nestjs/common';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  consume(key: string, max: number, ttlMs: number): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + ttlMs });
      this.pruneExpired(now);
      return true;
    }

    if (bucket.count >= max) {
      return false;
    }

    bucket.count += 1;
    return true;
  }

  private pruneExpired(now: number): void {
    if (this.buckets.size <= 1000) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}
