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
      auth: { protect: (options?: { unauthenticatedUrl?: string }) => Promise<void> },
      req: {
        url: string;
        headers: { get: (key: string) => string | null };
        nextUrl: { pathname: string };
      },
    ) => Promise<void>;

    const protect = jest.fn<(options?: { unauthenticatedUrl?: string }) => Promise<void>>(
      async () => undefined,
    );

    await middleware(
      { protect },
      {
        url: "http://localhost:3000/dashboard",
        headers: { get: () => null },
        nextUrl: { pathname: "/dashboard" },
      },
    );

    expect(protect).toHaveBeenCalledTimes(1);
    expect(protect).toHaveBeenCalledWith({
      unauthenticatedUrl: "http://localhost:3000/sign-in",
    });
  });

  it("skips protect on public routes", async () => {
    const module = require("../middleware");
    const middleware = module.default as (
      auth: { protect: () => Promise<void> },
      req: {
        url: string;
        headers: { get: (key: string) => string | null };
        nextUrl: { pathname: string };
      },
    ) => Promise<void>;

    const protect = jest.fn<() => Promise<void>>(async () => undefined);

    await middleware(
      { protect },
      {
        url: "http://localhost:3000/sign-in",
        headers: { get: () => null },
        nextUrl: { pathname: "/sign-in" },
      },
    );
    await middleware(
      { protect },
      {
        url: "http://localhost:3000/sign-up/sso-callback",
        headers: { get: () => null },
        nextUrl: { pathname: "/sign-up/sso-callback" },
      },
    );
    await middleware(
      { protect },
      {
        url: "http://localhost:3000/api/health/startup",
        headers: { get: () => null },
        nextUrl: { pathname: "/api/health/startup" },
      },
    );

    expect(protect).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated API routes", async () => {
    const module = require("../middleware");
    const middleware = module.default as (
      auth: {
        (): Promise<{ userId: string | null }>;
        protect: () => Promise<void>;
      },
      req: {
        url: string;
        headers: { get: (key: string) => string | null };
        nextUrl: { pathname: string };
      },
    ) => Promise<Response | void>;

    const protect = jest.fn<() => Promise<void>>(async () => undefined);
    const auth = Object.assign(jest.fn(async () => ({ userId: null })), {
      protect,
    }) as {
      (): Promise<{ userId: string | null }>;
      protect: () => Promise<void>;
    };

    const response = await middleware(auth, {
      url: "http://localhost:3000/api/upload/initiate",
      headers: { get: () => null },
      nextUrl: { pathname: "/api/upload/initiate" },
    });

    expect(response).toBeDefined();
    expect(response?.status).toBe(401);
    expect(protect).not.toHaveBeenCalled();
  });

  it("configures expected public-route matcher and middleware matchers", async () => {
    const module = require("../middleware");

    expect(createRouteMatcherMock).toHaveBeenCalledWith([
      "/sign-in(.*)",
      "/sign-up(.*)",
      "/api/health/startup(.*)",
    ]);

    expect(module.config.matcher).toContain("/(api|trpc)(.*)");
    expect(module.config.matcher).toContain(
      "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    );
  });
});
