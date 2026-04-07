import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const authMock: any = jest.fn();
const getCurrentUserMock: any = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

jest.mock("@/lib/actions/user.actions", () => ({
  getCurrentUser: getCurrentUserMock,
}));

jest.mock("@/lib/repositories/file.repository", () => ({
  fileRepository: {
    canAccessFile: jest.fn(),
    getById: jest.fn(),
  },
}));

jest.mock("@/lib/appwrite", () => ({
  createAdminClient: jest.fn(async () => ({
    storage: {
      getFile: jest.fn(),
      getFileDownload: jest.fn(),
      getFileView: jest.fn(),
    },
  })),
}));

jest.mock("@/lib/observability/logger", () => ({
  createRequestId: () => "req_e2e",
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("critical user journeys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("blocks unauthenticated secure file download", async () => {
    authMock.mockResolvedValue({ userId: null });
    getCurrentUserMock.mockResolvedValue(null);

    const { GET } = require("../../app/api/files/download/[id]/route");

    const response = await GET(
      {
        headers: new Headers(),
        nextUrl: new URL("http://localhost/api/files/download/file_1?mode=view"),
      },
      { params: Promise.resolve({ id: "file_1" }) },
    );

    expect(response.status).toBe(401);
  });
});
