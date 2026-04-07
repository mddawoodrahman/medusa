import { NextRequest, NextResponse } from "next/server";
import { ID, Permission, Role } from "node-appwrite";
import { auth } from "@clerk/nextjs/server";

import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite";
import { ensureAppwriteAuthUser } from "@/lib/appwrite/auth-user";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createRequestId, logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

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

    const body = await request.json().catch(() => ({}));
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
    const uploadToken = await users.createToken(
      appwriteAuthUserId,
      10,
      Math.floor(Date.now() / 1000) + 5 * 60,
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
    });
  } catch (error) {
    logger.error("Upload initiation failed", context, error);
    return NextResponse.json(
      { error: "Unable to initiate upload" },
      { status: 500 },
    );
  }
}
