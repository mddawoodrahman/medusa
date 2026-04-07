import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const createRouteMatcherMock = jest.fn((patterns: string[]) => {
  return (req: { nextUrl?: { pathname?: string } }) => {
    const pathname = req.nextUrl?.pathname ?? "";
    return patterns.some((pattern) => {
      if (pattern.endsWith("(.*)")) {
        const prefix = pattern.replace("(.*)", "");
        return pathname.startsWith(prefix);
      }
      return pathname === pattern;
    });
  };
});

const clerkMiddlewareMock = jest.fn((handler: unknown) => handler);

jest.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: clerkMiddlewareMock,
  createRouteMatcher: createRouteMatcherMock,
}));

describe("middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("protects private routes", async () => {
    const module = require("../middleware");
    const middleware = module.default as (
      auth: { protect: () => Promise<void> },
      req: { headers: { get: (key: string) => string | null }; nextUrl: { pathname: string } },
    ) => Promise<void>;

    const protect = jest.fn<() => Promise<void>>(async () => undefined);

    await middleware(
      { protect },
      {
        headers: { get: () => null },
        nextUrl: { pathname: "/dashboard" },
      },
    );

    expect(protect).toHaveBeenCalledTimes(1);
  });

  it("skips protect on sign-in and sign-up routes", async () => {
    const module = require("../middleware");
    const middleware = module.default as (
      auth: { protect: () => Promise<void> },
      req: { headers: { get: (key: string) => string | null }; nextUrl: { pathname: string } },
    ) => Promise<void>;

    const protect = jest.fn<() => Promise<void>>(async () => undefined);

    await middleware(
      { protect },
      {
        headers: { get: () => null },
        nextUrl: { pathname: "/sign-in" },
      },
    );
    await middleware(
      { protect },
      {
        headers: { get: () => null },
        nextUrl: { pathname: "/sign-up/sso-callback" },
      },
    );

    expect(protect).not.toHaveBeenCalled();
  });

  it("configures expected public-route matcher and middleware matchers", async () => {
    const module = require("../middleware");

    expect(createRouteMatcherMock).toHaveBeenCalledWith([
      "/sign-in(.*)",
      "/sign-up(.*)",
    ]);

    expect(module.config.matcher).toContain("/(api|trpc)(.*)");
    expect(module.config.matcher).toContain(
      "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    );
  });
});
