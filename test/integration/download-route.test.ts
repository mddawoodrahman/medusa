import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const authMock: any = jest.fn();
const getCurrentUserMock: any = jest.fn();
const canAccessFileMock: any = jest.fn();
const getByIdMock: any = jest.fn();
const getFileMock: any = jest.fn();
const getFilePreviewMock: any = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

jest.mock("@/lib/actions/user.actions", () => ({
  getCurrentUser: getCurrentUserMock,
}));

jest.mock("@/lib/repositories/file.repository", () => ({
  fileRepository: {
    canAccessFile: canAccessFileMock,
    getById: getByIdMock,
  },
}));

jest.mock("@/lib/appwrite", () => ({
  createAdminClient: jest.fn(async () => ({
    storage: {
      getFile: getFileMock,
      getFilePreview: getFilePreviewMock,
      getFileDownload: jest.fn(),
      getFileView: jest.fn(async () => new ArrayBuffer(4)),
    },
  })),
}));

jest.mock("@/lib/appwrite/config", () => ({
  appwriteConfig: {
    bucketId: "bucket_123",
  },
}));

jest.mock("@/lib/observability/logger", () => ({
  createRequestId: () => "req_download_test",
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("download route integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    authMock.mockResolvedValue({ userId: "user_clerk_1" });
    getCurrentUserMock.mockResolvedValue({
      clerkUserId: "user_clerk_1",
      email: "owner@example.com",
    });
    canAccessFileMock.mockResolvedValue(true);
    getByIdMock.mockResolvedValue({
      $id: "file_1",
      bucketField: "bucket_file_1",
      clerkUserId: "user_clerk_1",
    });
  });

  it("blocks thumbnail mode for non-image files", async () => {
    getFileMock.mockResolvedValue({
      mimeType: "application/pdf",
      name: "test.pdf",
    });

    const { GET } = require("../../app/api/files/download/[id]/route");

    const response = await GET(
      {
        headers: new Headers(),
        nextUrl: new URL("http://localhost/api/files/download/file_1?mode=thumbnail&w=100&h=100"),
      },
      { params: Promise.resolve({ id: "file_1" }) },
    );

    expect(response.status).toBe(400);
    expect(getFilePreviewMock).not.toHaveBeenCalled();
  });

  it("clamps thumbnail dimensions to safe limits", async () => {
    getFileMock.mockResolvedValue({
      mimeType: "image/png",
      name: "test.png",
    });
    getFilePreviewMock.mockResolvedValue(new ArrayBuffer(8));

    const { GET } = require("../../app/api/files/download/[id]/route");

    const response = await GET(
      {
        headers: new Headers(),
        nextUrl: new URL("http://localhost/api/files/download/file_1?mode=thumbnail&w=999999&h=-20"),
      },
      { params: Promise.resolve({ id: "file_1" }) },
    );

    expect(response.status).toBe(200);
    expect(getFilePreviewMock).toHaveBeenCalledWith(
      "bucket_123",
      "bucket_file_1",
      2000,
      16,
    );
  });
});
