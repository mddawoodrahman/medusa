import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const getCurrentUserMock: any = jest.fn();
const createMetadataMock: any = jest.fn();
const getByIdMock: any = jest.fn();
const getByBucketFieldAndOwnerMock: any = jest.fn();
const updateMetadataMock: any = jest.fn();
const upsertFileSharesMock: any = jest.fn();
const deleteMetadataMock: any = jest.fn();
const getByEmailMock: any = jest.fn();
const updateFileMock: any = jest.fn();
const deleteFileMock: any = jest.fn();
const getFileMock: any = jest.fn();
const incrementUploadCountMock: any = jest.fn();
const invalidateFileAndUserCachesMock: any = jest.fn();

jest.mock("@/lib/actions/user.actions", () => ({
  getCurrentUser: getCurrentUserMock,
}));

jest.mock("@/lib/repositories/file.repository", () => ({
  fileRepository: {
    createMetadata: createMetadataMock,
    getById: getByIdMock,
    getByBucketFieldAndOwner: getByBucketFieldAndOwnerMock,
    updateMetadata: updateMetadataMock,
    upsertFileShares: upsertFileSharesMock,
    listFiles: jest.fn(),
    deleteMetadata: deleteMetadataMock,
    listOwnedFiles: jest.fn(),
  },
}));

jest.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    getByEmail: getByEmailMock,
  },
}));

jest.mock("@/lib/appwrite", () => ({
  createAdminClient: jest.fn(async () => ({
    storage: {
      updateFile: updateFileMock,
      deleteFile: deleteFileMock,
      getFile: getFileMock,
    },
  })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  buildDashboardCacheKey: jest.fn(),
  buildUserFilesCacheKey: jest.fn(),
  CACHE_TTL_SECONDS: {
    fileMetadata: 300,
    userFiles: 45,
    dashboard: 60,
  },
  createUserFilesCacheFingerprint: jest.fn(),
  getCachedJson: jest.fn(),
  setCachedJson: jest.fn(),
  incrementUploadCount: incrementUploadCountMock,
  invalidateFileAndUserCaches: invalidateFileAndUserCachesMock,
}));

jest.mock("@/lib/observability/logger", () => ({
  createRequestId: () => "req_file_ops",
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("file operations integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    getCurrentUserMock.mockResolvedValue({
      clerkUserId: "clerk_owner",
      email: "owner@example.com",
      fullName: "Owner User",
    });

    incrementUploadCountMock.mockResolvedValue(1);
    invalidateFileAndUserCachesMock.mockResolvedValue(undefined);
    deleteMetadataMock.mockResolvedValue(undefined);
    deleteFileMock.mockResolvedValue(undefined);
    getByBucketFieldAndOwnerMock.mockResolvedValue(null);
    getFileMock.mockResolvedValue({
      $id: "bucket_file_1",
      name: "photo.png",
      sizeOriginal: 1024,
    });
  });

  it("stores metadata with secure download URL", async () => {
    createMetadataMock.mockImplementation(async ({ id, data }: any) => ({
      $id: id,
      ...data,
    }));

    const { createFileMetadata } = require("../../lib/actions/file.actions");

    const result = await createFileMetadata({
      bucketFileId: "bucket_file_1",
      fileName: "photo.png",
      size: 1024,
      path: "/",
    });

    expect(createMetadataMock).toHaveBeenCalledTimes(1);
    const firstCall = createMetadataMock.mock.calls[0][0] as {
      data: { url: string };
    };
    expect(firstCall.data.url).toContain("/api/files/download/");
    expect(firstCall.data.url).toContain("mode=view");
    expect(result.bucketField).toBe("bucket_file_1");
    expect(incrementUploadCountMock).toHaveBeenCalledWith("clerk_owner");
    expect(invalidateFileAndUserCachesMock).toHaveBeenCalledWith({
      ownerUserId: "clerk_owner",
      invalidateOwnerDashboard: true,
    });
  });

  it("reuses existing metadata when upload callback is retried", async () => {
    getByBucketFieldAndOwnerMock.mockResolvedValue({
      $id: "existing_file_1",
      bucketField: "bucket_file_1",
      clerkUserId: "clerk_owner",
    });

    const { createFileMetadata } = require("../../lib/actions/file.actions");

    const result = await createFileMetadata({
      bucketFileId: "bucket_file_1",
      fileName: "photo.png",
      size: 1024,
      path: "/",
    });

    expect(result.$id).toBe("existing_file_1");
    expect(createMetadataMock).not.toHaveBeenCalled();
    expect(getFileMock).not.toHaveBeenCalled();
  });

  it("updates sharing permissions without public access", async () => {
    getByIdMock.mockResolvedValue({
      $id: "file_1",
      clerkUserId: "clerk_owner",
      bucketField: "bucket_file_1",
      users: [],
    });

    getByEmailMock.mockResolvedValue({ clerkUserId: "clerk_shared_user" });
    updateMetadataMock.mockResolvedValue({ $id: "file_1", users: ["shared@example.com"] });

    const { updateFileUsers } = require("../../lib/actions/file.actions");

    await updateFileUsers({
      fileId: "file_1",
      emails: ["shared@example.com"],
      path: "/documents",
    });

    expect(updateFileMock).toHaveBeenCalledTimes(1);
    const permissions = updateFileMock.mock.calls[0][3] as string[];
    expect(permissions.some((permission) => permission.includes("any"))).toBe(false);
    expect(permissions.some((permission) => permission.includes("read(\"user:"))).toBe(true);
    expect(upsertFileSharesMock).toHaveBeenCalledTimes(1);
    expect(invalidateFileAndUserCachesMock).toHaveBeenCalledWith({
      fileId: "file_1",
      ownerUserId: "clerk_owner",
      relatedUserIds: ["clerk_shared_user"],
    });
  });

  it("rejects invalid share email addresses", async () => {
    getByIdMock.mockResolvedValue({
      $id: "file_1",
      clerkUserId: "clerk_owner",
      bucketField: "bucket_file_1",
      users: [],
    });

    const { updateFileUsers } = require("../../lib/actions/file.actions");

    await expect(
      updateFileUsers({
        fileId: "file_1",
        emails: ["not-an-email"],
        path: "/documents",
      }),
    ).rejects.toThrow("Invalid email list");

    expect(updateFileMock).not.toHaveBeenCalled();
  });

  it("supports unsharing all users and keeps owner-only permissions", async () => {
    getByIdMock.mockResolvedValue({
      $id: "file_1",
      clerkUserId: "clerk_owner",
      bucketField: "bucket_file_1",
      users: ["shared@example.com"],
    });

    getByEmailMock.mockResolvedValue({ clerkUserId: "clerk_shared_user" });
    updateMetadataMock.mockResolvedValue({ $id: "file_1", users: [] });

    const { updateFileUsers } = require("../../lib/actions/file.actions");

    await updateFileUsers({
      fileId: "file_1",
      emails: [],
      path: "/documents",
    });

    expect(upsertFileSharesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: "file_1",
        ownerId: "clerk_owner",
        principals: [],
      }),
    );
    expect(updateFileMock).toHaveBeenCalledTimes(1);
    const permissions = updateFileMock.mock.calls[0][3] as string[];
    expect(permissions.some((permission) => permission.includes("user:clerk_shared_user"))).toBe(false);
    expect(invalidateFileAndUserCachesMock).toHaveBeenCalledWith({
      fileId: "file_1",
      ownerUserId: "clerk_owner",
      relatedUserIds: ["clerk_shared_user"],
    });
  });

  it("invalidates related caches when file is renamed", async () => {
    getByIdMock.mockResolvedValue({
      $id: "file_1",
      clerkUserId: "clerk_owner",
      bucketField: "bucket_file_1",
      name: "old-name.png",
      users: ["shared@example.com"],
    });
    getByEmailMock.mockResolvedValue({ clerkUserId: "clerk_shared_user" });
    updateMetadataMock.mockResolvedValue({ $id: "file_1", name: "new-name.png" });

    const { renameFile } = require("../../lib/actions/file.actions");

    await renameFile({
      fileId: "file_1",
      name: "new-name",
      extension: "png",
      path: "/documents",
    });

    expect(updateFileMock).toHaveBeenCalledTimes(1);
    expect(updateFileMock.mock.calls[0][1]).toBe("bucket_file_1");
    expect(updateFileMock.mock.calls[0][2]).toBe("new-name.png");
    expect(invalidateFileAndUserCachesMock).toHaveBeenCalledWith({
      fileId: "file_1",
      ownerUserId: "clerk_owner",
      relatedUserIds: ["clerk_shared_user"],
    });
  });

  it("invalidates dashboard and file caches on delete", async () => {
    getByIdMock.mockResolvedValue({
      $id: "file_1",
      clerkUserId: "clerk_owner",
      bucketField: "bucket_file_1",
      users: ["shared@example.com"],
    });
    getByEmailMock.mockResolvedValue({ clerkUserId: "clerk_shared_user" });

    const { deleteFile } = require("../../lib/actions/file.actions");

    await deleteFile({
      fileId: "file_1",
      path: "/documents",
    });

    expect(deleteFileMock).toHaveBeenCalledTimes(1);
    expect(deleteFileMock.mock.calls[0][1]).toBe("bucket_file_1");
    expect(deleteMetadataMock).toHaveBeenCalledWith("file_1");
    expect(invalidateFileAndUserCachesMock).toHaveBeenCalledWith({
      fileId: "file_1",
      ownerUserId: "clerk_owner",
      relatedUserIds: ["clerk_shared_user"],
      invalidateOwnerDashboard: true,
    });
  });
});
