import Redis from "ioredis";

declare global {
  var __redisClient: Redis | null | undefined;
}

const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
};

export const getRedisClient = () => {
  if (globalThis.__redisClient === undefined) {
    globalThis.__redisClient = createRedisClient();
  }

  return globalThis.__redisClient;
};

export const isRedisEnabled = () => Boolean(process.env.REDIS_URL);
