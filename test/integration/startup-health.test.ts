import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const getBucketMock: any = jest.fn();
const pingMock: any = jest.fn();
const connectMock: any = jest.fn();
const getRedisClientMock: any = jest.fn();
const isRedisEnabledMock: any = jest.fn();

jest.mock("@/lib/appwrite", () => ({
  createAdminClient: jest.fn(async () => ({
    storage: {
      getBucket: getBucketMock,
    },
  })),
}));

jest.mock("@/lib/appwrite/config", () => ({
  appwriteConfig: {
    bucketId: "bucket_123",
  },
}));

jest.mock("@/lib/redis", () => ({
  getRedisClient: getRedisClientMock,
  isRedisEnabled: isRedisEnabledMock,
}));

jest.mock("@/lib/observability/logger", () => ({
  createRequestId: () => "req_health_test",
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("startup health route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    isRedisEnabledMock.mockReturnValue(true);
    getRedisClientMock.mockReturnValue({
      status: "ready",
      connect: connectMock,
      ping: pingMock,
    });
    pingMock.mockResolvedValue("PONG");

    getBucketMock.mockResolvedValue({
      $id: "bucket_123",
      enabled: true,
      fileSecurity: true,
      maximumFileSize: 52_428_800,
      $permissions: ['create("users")'],
    });
  });

  it("returns 200 when dependencies are healthy", async () => {
    const { GET } = require("../../app/api/health/startup/route");

    const response = await GET(
      new Request("http://localhost:3000/api/health/startup", {
        headers: new Headers(),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks.redis.ok).toBe(true);
    expect(body.checks.appwriteBucket.ok).toBe(true);
  });

  it("returns 503 when redis is not configured", async () => {
    isRedisEnabledMock.mockReturnValue(false);

    const { GET } = require("../../app/api/health/startup/route");

    const response = await GET(
      new Request("http://localhost:3000/api/health/startup", {
        headers: new Headers(),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.checks.redis.ok).toBe(false);
  });

  it("returns 503 when bucket policy is misconfigured", async () => {
    getBucketMock.mockResolvedValue({
      $id: "bucket_123",
      enabled: true,
      fileSecurity: false,
      maximumFileSize: 52_428_800,
      $permissions: [],
    });

    const { GET } = require("../../app/api/health/startup/route");

    const response = await GET(
      new Request("http://localhost:3000/api/health/startup", {
        headers: new Headers(),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.appwriteBucket.ok).toBe(false);
  });
});
