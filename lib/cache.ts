import { createHash } from "crypto";

import { getRedisClient } from "@/lib/redis";

type CachePayload = Record<string, unknown> | unknown[];

type SetCacheOptions = {
  ttlSeconds: number;
  userFilesIndexUserId?: string;
};

export const CACHE_TTL_SECONDS = {
  fileMetadata: 300,
  userFiles: 45,
  dashboard: 60,
} as const;

const getUserFilesIndexKey = (userId: string) =>
  `cache-index:user:${userId}:files`;

export const buildFileCacheKey = (fileId: string) => `file:${fileId}`;

export const buildDashboardCacheKey = (userId: string) =>
  `dashboard:${userId}`;

export const createUserFilesCacheFingerprint = (input: {
  types: string[];
  searchText: string;
  sort: string;
  limit: number;
  cursor?: string;
}) => {
  const normalized = {
    types: [...input.types].sort(),
    searchText: input.searchText,
    sort: input.sort,
    limit: input.limit,
    cursor: input.cursor || "",
  };

  return createHash("sha1")
    .update(JSON.stringify(normalized))
    .digest("hex");
};

export const buildUserFilesCacheKey = (userId: string, fingerprint: string) =>
  `user:${userId}:files:${fingerprint}`;

export const getCachedJson = async <T = CachePayload>(
  key: string,
): Promise<T | null> => {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const setCachedJson = async (
  key: string,
  value: CachePayload,
  options: SetCacheOptions,
) => {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    const pipeline = redis.pipeline();
    pipeline.set(key, JSON.stringify(value), "EX", options.ttlSeconds);

    if (options.userFilesIndexUserId) {
      const indexKey = getUserFilesIndexKey(options.userFilesIndexUserId);
      const indexTtl = Math.max(options.ttlSeconds, CACHE_TTL_SECONDS.userFiles);

      pipeline.sadd(indexKey, key);
      pipeline.expire(indexKey, indexTtl);
    }

    await pipeline.exec();
  } catch {
    // Cache write errors are non-fatal for request handling.
  }
};

export const invalidateFileMetadataCache = async (fileId: string) => {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.del(buildFileCacheKey(fileId));
  } catch {
    // Cache invalidation errors are non-fatal for request handling.
  }
};

export const invalidateDashboardCache = async (userId: string) => {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.del(buildDashboardCacheKey(userId));
  } catch {
    // Cache invalidation errors are non-fatal for request handling.
  }
};

export const invalidateUserFilesCache = async (userId: string) => {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  const indexKey = getUserFilesIndexKey(userId);

  try {
    const keys = await redis.smembers(indexKey);

    if (keys.length === 0) {
      await redis.del(indexKey);
      return;
    }

    const pipeline = redis.pipeline();

    for (const key of keys) {
      pipeline.del(key);
    }

    pipeline.del(indexKey);
    await pipeline.exec();
  } catch {
    // Cache invalidation errors are non-fatal for request handling.
  }
};

export const invalidateFileAndUserCaches = async ({
  fileId,
  ownerUserId,
  relatedUserIds = [],
  invalidateOwnerDashboard = false,
}: {
  fileId?: string;
  ownerUserId: string;
  relatedUserIds?: string[];
  invalidateOwnerDashboard?: boolean;
}) => {
  const uniqueUsers = new Set<string>([ownerUserId, ...relatedUserIds]);

  const tasks: Promise<unknown>[] = [];

  if (fileId) {
    tasks.push(invalidateFileMetadataCache(fileId));
  }

  if (invalidateOwnerDashboard) {
    tasks.push(invalidateDashboardCache(ownerUserId));
  }

  for (const userId of uniqueUsers) {
    tasks.push(invalidateUserFilesCache(userId));
  }

  await Promise.all(tasks);
};

const incrementCounter = async (key: string) => {
  const redis = getRedisClient();

  if (!redis) {
    return 0;
  }

  try {
    const nextValue = await redis.incr(key);
    return Number(nextValue) || 0;
  } catch {
    return 0;
  }
};

export const incrementUploadCount = async (userId: string) =>
  incrementCounter(`user:${userId}:uploads_count`);

export const incrementDownloadCount = async (userId: string) =>
  incrementCounter(`user:${userId}:downloads_count`);
