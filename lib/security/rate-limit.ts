import { getRedisClient } from "@/lib/redis";

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetMs: number;
};

type CheckRateLimitInput = {
  scope: "upload" | "download";
  userId: string;
  ip: string;
  maxRequests: number;
  windowMs: number;
};

type FallbackRateLimitRecord = {
  count: number;
  windowStartMs: number;
};

const fallbackStores = new Map<string, Map<string, FallbackRateLimitRecord>>();

const FIXED_WINDOW_SCRIPT = `
  local current = redis.call("INCR", KEYS[1])
  if current == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
  end
  local ttl = redis.call("PTTL", KEYS[1])
  return { current, ttl }
`;

const getFallbackStore = (scope: string) => {
  let store = fallbackStores.get(scope);

  if (!store) {
    store = new Map<string, FallbackRateLimitRecord>();
    fallbackStores.set(scope, store);
  }

  return store;
};

const pruneFallbackEntries = (
  store: Map<string, FallbackRateLimitRecord>,
  nowMs: number,
  windowMs: number,
) => {
  for (const [key, value] of store.entries()) {
    if (nowMs - value.windowStartMs >= windowMs) {
      store.delete(key);
    }
  }
};

const consumeFallbackFixedWindow = ({
  scope,
  key,
  windowMs,
}: {
  scope: string;
  key: string;
  windowMs: number;
}) => {
  const nowMs = Date.now();
  const store = getFallbackStore(scope);

  if (store.size > 1000) {
    pruneFallbackEntries(store, nowMs, windowMs);
  }

  const existing = store.get(key);

  if (!existing || nowMs - existing.windowStartMs >= windowMs) {
    store.set(key, { count: 1, windowStartMs: nowMs });
    return {
      count: 1,
      resetMs: nowMs + windowMs,
    };
  }

  existing.count += 1;

  return {
    count: existing.count,
    resetMs: existing.windowStartMs + windowMs,
  };
};

const parseScriptResult = (result: unknown) => {
  const values = Array.isArray(result) ? result : [];
  const count = Number(values[0]) || 0;
  const ttlMs = Number(values[1]) || 0;

  return {
    count,
    ttlMs,
  };
};

export const checkRateLimit = async ({
  scope,
  userId,
  ip,
  maxRequests,
  windowMs,
}: CheckRateLimitInput): Promise<RateLimitResult> => {
  const redis = getRedisClient();
  const userKey = `${scope}:${userId}`;
  const abuseKey = `user:${userId}:ip:${ip}:${scope}`;

  if (!redis) {
    const userResult = consumeFallbackFixedWindow({
      scope,
      key: userKey,
      windowMs,
    });
    const abuseResult = consumeFallbackFixedWindow({
      scope,
      key: abuseKey,
      windowMs,
    });

    const highestCount = Math.max(userResult.count, abuseResult.count);

    return {
      success: highestCount <= maxRequests,
      remaining: Math.max(0, maxRequests - highestCount),
      resetMs: Math.max(userResult.resetMs, abuseResult.resetMs),
    };
  }

  try {
    const results = await redis
      .pipeline()
      .eval(FIXED_WINDOW_SCRIPT, 1, userKey, String(windowMs))
      .eval(FIXED_WINDOW_SCRIPT, 1, abuseKey, String(windowMs))
      .exec();

    if (results?.some(([error]) => Boolean(error))) {
      throw new Error("Redis pipeline execution failed");
    }

    const userWindow = parseScriptResult(results?.[0]?.[1]);
    const abuseWindow = parseScriptResult(results?.[1]?.[1]);
    const highestCount = Math.max(userWindow.count, abuseWindow.count);
    const maxTtlMs = Math.max(userWindow.ttlMs, abuseWindow.ttlMs, 0);

    return {
      success: highestCount <= maxRequests,
      remaining: Math.max(0, maxRequests - highestCount),
      resetMs: Date.now() + (maxTtlMs > 0 ? maxTtlMs : windowMs),
    };
  } catch {
    const userResult = consumeFallbackFixedWindow({
      scope,
      key: userKey,
      windowMs,
    });
    const abuseResult = consumeFallbackFixedWindow({
      scope,
      key: abuseKey,
      windowMs,
    });
    const highestCount = Math.max(userResult.count, abuseResult.count);

    return {
      success: highestCount <= maxRequests,
      remaining: Math.max(0, maxRequests - highestCount),
      resetMs: Math.max(userResult.resetMs, abuseResult.resetMs),
    };
  }
};
