import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { isDemoMode } from "@/lib/demo/config";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** Auth endpoints: 10 attempts / 10s per identifier (IP or email). */
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  prefix: "rl:auth",
  analytics: true,
});

/** Write endpoints: 60 requests / 60s per user. */
export const writeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  prefix: "rl:write",
  analytics: true,
});

/** Best-effort limiter — never blocks the request if Redis is unreachable. */
export async function checkLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{ success: boolean; remaining: number }> {
  if (isDemoMode()) return { success: true, remaining: 999 };
  try {
    const { success, remaining } = await limiter.limit(identifier);
    return { success, remaining };
  } catch {
    return { success: true, remaining: -1 };
  }
}
