type RateLimitRecord = {
  count: number;
  windowStartMs: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetMs: number;
};

const stores = new Map<string, Map<string, RateLimitRecord>>();

const getStore = (scope: string) => {
  let store = stores.get(scope);

  if (!store) {
    store = new Map<string, RateLimitRecord>();
    stores.set(scope, store);
  }

  return store;
};

const pruneExpiredEntries = (
  store: Map<string, RateLimitRecord>,
  nowMs: number,
  windowMs: number,
) => {
  for (const [key, value] of store.entries()) {
    if (nowMs - value.windowStartMs >= windowMs) {
      store.delete(key);
    }
  }
};

export const checkRateLimit = ({
  scope,
  key,
  maxRequests,
  windowMs,
}: {
  scope: string;
  key: string;
  maxRequests: number;
  windowMs: number;
}): RateLimitResult => {
  const nowMs = Date.now();
  const store = getStore(scope);

  // Keep memory bounded by dropping entries that are already outside the active window.
  if (store.size > 1000) {
    pruneExpiredEntries(store, nowMs, windowMs);
  }

  const existing = store.get(key);

  if (!existing || nowMs - existing.windowStartMs >= windowMs) {
    store.set(key, { count: 1, windowStartMs: nowMs });

    return {
      success: true,
      remaining: Math.max(maxRequests - 1, 0),
      resetMs: nowMs + windowMs,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetMs: existing.windowStartMs + windowMs,
    };
  }

  existing.count += 1;

  return {
    success: true,
    remaining: Math.max(maxRequests - existing.count, 0),
    resetMs: existing.windowStartMs + windowMs,
  };
};
