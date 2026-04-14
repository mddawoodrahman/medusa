import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const getRedisClientMock: any = jest.fn();

jest.mock("@/lib/redis", () => ({
  getRedisClient: getRedisClientMock,
}));

describe("redis-backed rate limit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("uses Redis pipeline result to allow request within limit", async () => {
    const pipeline = {
      eval: jest.fn().mockReturnThis(),
      exec: jest.fn<() => Promise<unknown>>(async () => [
        [null, [2, 52_000]],
        [null, [3, 52_000]],
      ]),
    };

    getRedisClientMock.mockReturnValue({
      pipeline: () => pipeline,
    });

    const { checkRateLimit } = require("../../lib/security/rate-limit");
    const result = await checkRateLimit({
      scope: "upload",
      userId: "clerk_1",
      ip: "127.0.0.1",
      maxRequests: 5,
      windowMs: 60_000,
    });

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
    expect(pipeline.eval).toHaveBeenCalledTimes(2);
  });

  it("blocks request when Redis count exceeds maxRequests", async () => {
    const pipeline = {
      eval: jest.fn().mockReturnThis(),
      exec: jest.fn<() => Promise<unknown>>(async () => [
        [null, [6, 45_000]],
        [null, [7, 45_000]],
      ]),
    };

    getRedisClientMock.mockReturnValue({
      pipeline: () => pipeline,
    });

    const { checkRateLimit } = require("../../lib/security/rate-limit");
    const result = await checkRateLimit({
      scope: "download",
      userId: "clerk_2",
      ip: "10.0.0.2",
      maxRequests: 5,
      windowMs: 60_000,
    });

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("falls back to in-memory limiter when Redis is unavailable", async () => {
    getRedisClientMock.mockReturnValue(null);

    const { checkRateLimit } = require("../../lib/security/rate-limit");

    const firstAttempt = await checkRateLimit({
      scope: "upload",
      userId: "clerk_3",
      ip: "192.168.1.10",
      maxRequests: 1,
      windowMs: 60_000,
    });

    const secondAttempt = await checkRateLimit({
      scope: "upload",
      userId: "clerk_3",
      ip: "192.168.1.10",
      maxRequests: 1,
      windowMs: 60_000,
    });

    expect(firstAttempt.success).toBe(true);
    expect(secondAttempt.success).toBe(false);
    expect(secondAttempt.remaining).toBe(0);
  });
});
