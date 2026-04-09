import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { fileRepository } from "@/lib/repositories/file.repository";
import { createRequestId, logger } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const toContentDispositionFilename = (fileName: string) =>
  fileName.replace(/[\r\n"]/g, "");

const DEFAULT_THUMBNAIL_DIMENSION = 160;
const MIN_THUMBNAIL_DIMENSION = 16;
const MAX_THUMBNAIL_DIMENSION = 2000;

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
};

const sanitizeThumbnailDimension = (value: string | null) => {
  if (!value) {
    return DEFAULT_THUMBNAIL_DIMENSION;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_THUMBNAIL_DIMENSION;
  }

  const rounded = Math.round(parsed);

  return Math.min(
    MAX_THUMBNAIL_DIMENSION,
    Math.max(MIN_THUMBNAIL_DIMENSION, rounded),
  );
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = request.headers.get("x-request-id") ?? createRequestId();
  const { id } = await params;
  const requestedMode = request.nextUrl.searchParams.get("mode");
  const mode = requestedMode === "download"
    ? "download"
    : requestedMode === "thumbnail"
      ? "thumbnail"
      : "view";
  const thumbnailWidth = sanitizeThumbnailDimension(
    request.nextUrl.searchParams.get("w"),
  );
  const thumbnailHeight = sanitizeThumbnailDimension(
    request.nextUrl.searchParams.get("h"),
  );

  const context = {
    requestId,
    route: `/api/files/download/${id}`,
  };

  try {
    const { userId } = await auth();

    if (!userId) {
      logger.warn("Download blocked: unauthenticated request", context);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      logger.warn("Download blocked: user profile missing", {
        ...context,
        userId,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rateLimitKey = `${currentUser.clerkUserId}:${clientIp}`;
    const rateLimitResult = checkRateLimit({
      scope: "download",
      key: rateLimitKey,
      maxRequests: 120,
      windowMs: 60_000,
    });

    if (!rateLimitResult.success) {
      logger.warn("Download blocked: rate limit exceeded", {
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

    const canAccess = await fileRepository.canAccessFile(id, {
      clerkUserId: currentUser.clerkUserId,
      email: currentUser.email,
    });

    if (!canAccess) {
      logger.warn("Download blocked: access denied", {
        ...context,
        userId: currentUser.clerkUserId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await fileRepository.getById(id);
    const bucketFileId = file.bucketField;

    if (!bucketFileId) {
      logger.warn("Download blocked: missing storage object id", {
        ...context,
        userId: currentUser.clerkUserId,
      });
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { storage } = await createAdminClient();
    const storageFile = await storage.getFile(appwriteConfig.bucketId, bucketFileId);

    let content: ArrayBuffer;

    if (mode === "download") {
      content = await storage.getFileDownload(appwriteConfig.bucketId, bucketFileId);
    } else if (mode === "thumbnail") {
      if (!String(storageFile.mimeType || "").startsWith("image/")) {
        logger.warn("Thumbnail blocked: non-image file", {
          ...context,
          userId: currentUser.clerkUserId,
          fileId: id,
          mimeType: storageFile.mimeType,
        });
        return NextResponse.json({ error: "Thumbnail not available" }, { status: 400 });
      }

      content = await storage.getFilePreview(
        appwriteConfig.bucketId,
        bucketFileId,
        thumbnailWidth,
        thumbnailHeight,
      );
    } else {
      content = await storage.getFileView(appwriteConfig.bucketId, bucketFileId);
    }

    const headers = new Headers({
      "Content-Type":
        mode === "thumbnail" ? "image/webp" : storageFile.mimeType || "application/octet-stream",
      "Cache-Control":
        mode === "download"
          ? "private, no-store"
          : "private, max-age=300, stale-while-revalidate=86400",
      "X-Request-Id": requestId,
      "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      "X-RateLimit-Reset": String(rateLimitResult.resetMs),
    });

    if (mode === "download") {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${toContentDispositionFilename(storageFile.name)}"`,
      );
    }

    logger.info("Secure download generated", {
      ...context,
      userId: currentUser.clerkUserId,
      fileId: id,
      mode,
    });

    return new NextResponse(content, { status: 200, headers });
  } catch (error) {
    logger.error("Secure download failed", context, error, { fileId: id });
    return NextResponse.json(
      { error: "Unable to fetch file" },
      { status: 500 },
    );
  }
}
