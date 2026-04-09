import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const getCurrentUserMock: any = jest.fn();
const createMetadataMock: any = jest.fn();
const getByIdMock: any = jest.fn();
const updateMetadataMock: any = jest.fn();
const upsertFileSharesMock: any = jest.fn();
const getByEmailMock: any = jest.fn();
const updateFileMock: any = jest.fn();

jest.mock("@/lib/actions/user.actions", () => ({
  getCurrentUser: getCurrentUserMock,
}));

jest.mock("@/lib/repositories/file.repository", () => ({
  fileRepository: {
    createMetadata: createMetadataMock,
    getById: getByIdMock,
    updateMetadata: updateMetadataMock,
    upsertFileShares: upsertFileSharesMock,
    listFiles: jest.fn(),
    deleteMetadata: jest.fn(),
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
      deleteFile: jest.fn(),
    },
  })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
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
});
