import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { fileRepository } from "@/lib/repositories/file.repository";
import { createRequestId, logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

const toContentDispositionFilename = (fileName: string) =>
  fileName.replace(/[\r\n"]/g, "");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = request.headers.get("x-request-id") ?? createRequestId();
  const { id } = await params;
  const mode = request.nextUrl.searchParams.get("mode") === "download"
    ? "download"
    : "view";

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

    const [storageFile, content] = await Promise.all([
      storage.getFile(appwriteConfig.bucketId, bucketFileId),
      mode === "download"
        ? storage.getFileDownload(appwriteConfig.bucketId, bucketFileId)
        : storage.getFileView(appwriteConfig.bucketId, bucketFileId),
    ]);

    const headers = new Headers({
      "Content-Type": storageFile.mimeType || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
      "X-Request-Id": requestId,
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
