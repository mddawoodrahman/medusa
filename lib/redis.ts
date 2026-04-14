import Redis from "ioredis";

declare global {
  var __redisClient: Redis | null | undefined;
}

const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL
    ?.trim()
    .replace(/^['\"]|['\"]$/g, "")
    .trim();

  if (!redisUrl) {
    return null;
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on("error", (error) => {
    if (process.env.NODE_ENV !== "test") {
      console.error(`[redis] ${error.message}`);
    }
  });

  return redis;
};

export const getRedisClient = () => {
  if (globalThis.__redisClient === undefined) {
    globalThis.__redisClient = createRedisClient();
  }

  return globalThis.__redisClient;
};

export const isRedisEnabled = () => Boolean(process.env.REDIS_URL);
