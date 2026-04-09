import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const authMock: any = jest.fn();
const getCurrentUserMock: any = jest.fn();
const ensureAppwriteAuthUserMock: any = jest.fn();
const createTokenMock: any = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

jest.mock("@/lib/actions/user.actions", () => ({
  getCurrentUser: getCurrentUserMock,
}));

jest.mock("@/lib/appwrite/auth-user", () => ({
  ensureAppwriteAuthUser: ensureAppwriteAuthUserMock,
}));

jest.mock("@/lib/appwrite", () => ({
  createAdminClient: jest.fn(async () => ({
    users: {
      createToken: createTokenMock,
    },
  })),
}));

jest.mock("@/lib/appwrite/config", () => ({
  appwriteConfig: {
    endpointUrl: "https://cloud.appwrite.io/v1",
    projectId: "project_123",
    bucketId: "bucket_123",
    maxUploadSizeBytes: 52_428_800,
  },
}));

jest.mock("@/lib/observability/logger", () => ({
  createRequestId: () => "req_upload_test",
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("upload initiate route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("returns 401 for unauthenticated requests", async () => {
    authMock.mockResolvedValue({ userId: null });

    const { POST } = require("../../app/api/upload/initiate/route");

    const response = await POST({
      headers: new Headers(),
      json: async () => ({}),
    });

    expect(response.status).toBe(401);
  });

  it("returns upload config and token for authenticated users", async () => {
    authMock.mockResolvedValue({ userId: "user_clerk_1" });
    getCurrentUserMock.mockResolvedValue({
      clerkUserId: "user_clerk_1",
      email: "owner@example.com",
      fullName: "Owner User",
    });
    ensureAppwriteAuthUserMock.mockResolvedValue("clerk_hashed_owner");
    createTokenMock.mockResolvedValue({
      userId: "clerk_hashed_owner",
      secret: "secret_token",
      expire: "2026-04-07T12:00:00.000Z",
    });

    const { POST } = require("../../app/api/upload/initiate/route");

    const response = await POST({
      headers: new Headers(),
      json: async () => ({ fileName: "invoice.pdf", size: 1024 }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.upload.bucketId).toBe("bucket_123");
    expect(body.token.secret).toBe("secret_token");
    expect(body.upload.permissions.some((permission: string) => permission.includes("user:"))).toBe(true);
    expect(body.upload.permissions.some((permission: string) => permission.includes("any"))).toBe(false);
    expect(typeof body.rateLimit.remaining).toBe("number");
  });

  it("returns 400 for invalid upload payload", async () => {
    authMock.mockResolvedValue({ userId: "user_clerk_1" });
    getCurrentUserMock.mockResolvedValue({
      clerkUserId: "user_clerk_1",
      email: "owner@example.com",
      fullName: "Owner User",
    });

    const { POST } = require("../../app/api/upload/initiate/route");

    const response = await POST({
      headers: new Headers(),
      json: async () => ({ fileName: "", size: 0 }),
    });

    expect(response.status).toBe(400);
  });
});
