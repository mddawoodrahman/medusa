import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const authMock: any = jest.fn();
const clerkCurrentUserMock: any = jest.fn();
const getByClerkUserIdMock: any = jest.fn();
const createFromClerkProfileMock: any = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: clerkCurrentUserMock,
}));

jest.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    getByClerkUserId: getByClerkUserIdMock,
    createFromClerkProfile: createFromClerkProfileMock,
  },
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/observability/logger", () => ({
  createRequestId: () => "req_auth_test",
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("auth flow integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("returns existing user profile when already provisioned", async () => {
    authMock.mockResolvedValue({ userId: "clerk_123" });
    getByClerkUserIdMock.mockResolvedValue({
      $id: "doc_1",
      clerkUserId: "clerk_123",
      email: "existing@example.com",
    });

    const { getCurrentUser } = require("../../lib/actions/user.actions");
    const user = await getCurrentUser();

    expect(user.clerkUserId).toBe("clerk_123");
    expect(createFromClerkProfileMock).not.toHaveBeenCalled();
  });

  it("provisions user from Clerk profile when missing", async () => {
    authMock.mockResolvedValue({ userId: "clerk_456" });
    getByClerkUserIdMock.mockResolvedValue(null);
    clerkCurrentUserMock.mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
      username: "jdoe",
      imageUrl: "https://example.com/avatar.jpg",
      primaryEmailAddress: { emailAddress: "jane@example.com" },
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    });

    createFromClerkProfileMock.mockResolvedValue({
      $id: "doc_2",
      clerkUserId: "clerk_456",
      email: "jane@example.com",
    });

    const { getCurrentUser } = require("../../lib/actions/user.actions");
    const user = await getCurrentUser();

    expect(createFromClerkProfileMock).toHaveBeenCalledTimes(1);
    expect(user.clerkUserId).toBe("clerk_456");
  });
});
