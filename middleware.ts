import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { createRequestId, logger } from "@/lib/observability/logger";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const requestId = req.headers.get("x-request-id") ?? createRequestId();
  const route = req.nextUrl.pathname;

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

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
