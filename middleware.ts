import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createRequestId, logger } from "@/lib/observability/logger";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health/startup(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const requestId = req.headers.get("x-request-id") ?? createRequestId();
  const route = req.nextUrl.pathname;
  const isApiRoute = route.startsWith("/api") || route.startsWith("/trpc");

  if (isPublicRoute(req)) {
    logger.info("Middleware allowed public route", {
      requestId,
      route,
    });
    return;
  }

  logger.info("Middleware enforcing protected route", {
    requestId,
    route,
  });

  if (isApiRoute) {
    const { userId } = await auth();

    if (!userId) {
      logger.warn("Middleware blocked unauthenticated API request", {
        requestId,
        route,
      });

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return;
  }

  await auth.protect({
    unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
  });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
