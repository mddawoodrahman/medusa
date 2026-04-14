import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const getRedisClientMock: any = jest.fn();

jest.mock("@/lib/redis", () => ({
  getRedisClient: getRedisClientMock,
}));

describe("cache utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("stores JSON payload and indexes user file cache key", async () => {
    const pipeline = {
      set: jest.fn().mockReturnThis(),
      sadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn<() => Promise<unknown[]>>(async () => []),
    };

    getRedisClientMock.mockReturnValue({
      pipeline: () => pipeline,
    });

    const { setCachedJson } = require("../../lib/cache");

    await setCachedJson("user:clerk_1:files:abc", { total: 1 }, {
      ttlSeconds: 45,
      userFilesIndexUserId: "clerk_1",
    });

    expect(pipeline.set).toHaveBeenCalledWith(
      "user:clerk_1:files:abc",
      JSON.stringify({ total: 1 }),
      "EX",
      45,
    );
    expect(pipeline.sadd).toHaveBeenCalledWith(
      "cache-index:user:clerk_1:files",
      "user:clerk_1:files:abc",
    );
    expect(pipeline.expire).toHaveBeenCalled();
  });

  it("invalidates all indexed user files cache keys", async () => {
    const pipeline = {
      del: jest.fn().mockReturnThis(),
      exec: jest.fn<() => Promise<unknown[]>>(async () => []),
    };

    getRedisClientMock.mockReturnValue({
      smembers: jest.fn<() => Promise<string[]>>(async () => [
        "user:clerk_2:files:key1",
        "user:clerk_2:files:key2",
      ]),
      pipeline: () => pipeline,
    });

    const { invalidateUserFilesCache } = require("../../lib/cache");

    await invalidateUserFilesCache("clerk_2");

    expect(pipeline.del).toHaveBeenCalledWith("user:clerk_2:files:key1");
    expect(pipeline.del).toHaveBeenCalledWith("user:clerk_2:files:key2");
    expect(pipeline.del).toHaveBeenCalledWith("cache-index:user:clerk_2:files");
  });

  it("increments upload and download counters atomically", async () => {
    const incrMock = jest.fn<() => Promise<number>>()
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(9);

    getRedisClientMock.mockReturnValue({
      incr: incrMock,
    });

    const { incrementUploadCount, incrementDownloadCount } = require("../../lib/cache");

    const uploadCount = await incrementUploadCount("clerk_4");
    const downloadCount = await incrementDownloadCount("clerk_4");

    expect(uploadCount).toBe(4);
    expect(downloadCount).toBe(9);
    expect(incrMock).toHaveBeenNthCalledWith(1, "user:clerk_4:uploads_count");
    expect(incrMock).toHaveBeenNthCalledWith(2, "user:clerk_4:downloads_count");
  });
});
