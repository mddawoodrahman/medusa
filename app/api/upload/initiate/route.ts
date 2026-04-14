import { NextRequest, NextResponse } from "next/server";
import { ID, Permission, Role } from "node-appwrite";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite";
import { ensureAppwriteAuthUser } from "@/lib/appwrite/auth-user";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createRequestId, logger } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const uploadRequestSchema = z.object({
  fileId: z.string().min(1).max(128).optional(),
  fileName: z.string().min(1).max(512),
  size: z.number().int().positive(),
});

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? createRequestId();
  const context = { requestId, route: "/api/upload/initiate" };

  try {
    const { userId } = await auth();

    if (!userId) {
      logger.warn("Upload initiation blocked: unauthenticated request", context);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      logger.warn("Upload initiation blocked: user profile missing", {
        ...context,
        userId,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit({
      scope: "upload",
      userId: currentUser.clerkUserId,
      ip: clientIp,
      maxRequests: 20,
      windowMs: 60_000,
    });

    if (!rateLimitResult.success) {
      logger.warn("Upload initiation blocked: rate limit exceeded", {
        ...context,
        userId: currentUser.clerkUserId,
        clientIp,
      });

      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rateLimitResult.resetMs - Date.now()) / 1000),
      );

      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetMs),
          },
        },
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsedBody = uploadRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      logger.warn("Upload initiation blocked: invalid request payload", {
        ...context,
        userId: currentUser.clerkUserId,
      });
      return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    }

    const body = parsedBody.data;

    if (body.size > appwriteConfig.maxUploadSizeBytes) {
      logger.warn("Upload initiation blocked: file exceeds configured limit", {
        ...context,
        userId: currentUser.clerkUserId,
        fileSize: body.size,
      });
      return NextResponse.json({ error: "File size exceeds upload limit" }, { status: 413 });
    }

    const requestedFileId =
      typeof body.fileId === "string" && body.fileId.length > 0
        ? body.fileId
        : ID.unique();

    const appwriteAuthUserId = await ensureAppwriteAuthUser({
      clerkUserId: currentUser.clerkUserId,
      email: currentUser.email,
      fullName: currentUser.fullName,
    });

    const { users } = await createAdminClient();
    const estimatedUploadSeconds = Math.ceil(body.size / (5 * 1024 * 1024));
    const tokenTtlSeconds = Math.min(
      20 * 60,
      Math.max(5 * 60, estimatedUploadSeconds * 2),
    );

    const uploadToken = await users.createToken(
      appwriteAuthUserId,
      10,
      Math.floor(Date.now() / 1000) + tokenTtlSeconds,
    );

    // Files are private by default and scoped to the authenticated owner identity.
    const permissions = [
      Permission.read(Role.user(appwriteAuthUserId)),
      Permission.update(Role.user(appwriteAuthUserId)),
      Permission.delete(Role.user(appwriteAuthUserId)),
    ];

    logger.info("Upload initiation succeeded", {
      ...context,
      userId: currentUser.clerkUserId,
    });

    return NextResponse.json({
      requestId,
      upload: {
        endpoint: appwriteConfig.endpointUrl,
        projectId: appwriteConfig.projectId,
        bucketId: appwriteConfig.bucketId,
        fileId: requestedFileId,
        permissions,
        maxFileSizeBytes: appwriteConfig.maxUploadSizeBytes,
      },
      token: {
        userId: uploadToken.userId,
        secret: uploadToken.secret,
        expire: uploadToken.expire,
      },
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetMs: rateLimitResult.resetMs,
      },
    });
  } catch (error) {
    logger.error("Upload initiation failed", context, error);
    return NextResponse.json(
      { error: "Unable to initiate upload" },
      { status: 500 },
    );
  }
}
