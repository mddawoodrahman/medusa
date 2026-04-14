"use server";

import { ID, Permission, Query, Role } from "node-appwrite";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite";
import { toAppwriteAuthUserId } from "@/lib/appwrite/auth-user";
import {
  buildDashboardCacheKey,
  buildUserFilesCacheKey,
  CACHE_TTL_SECONDS,
  createUserFilesCacheFingerprint,
  getCachedJson,
  incrementUploadCount,
  invalidateFileAndUserCaches,
  setCachedJson,
} from "@/lib/cache";
import { getFileType, parseStringify } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { fileRepository } from "@/lib/repositories/file.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { createRequestId, logger } from "@/lib/observability/logger";

const handleError = (
  error: unknown,
  message: string,
  context: { requestId: string; userId?: string; route?: string },
) => {
  logger.error(message, context, error);
  throw error;
};

const emailSchema = z.string().trim().toLowerCase().email();

const buildDefaultTotalSpace = () => ({
  image: { size: 0, latestDate: "" },
  document: { size: 0, latestDate: "" },
  video: { size: 0, latestDate: "" },
  audio: { size: 0, latestDate: "" },
  other: { size: 0, latestDate: "" },
  used: 0,
  all: 2 * 1024 * 1024 * 1024,
});

type TotalSpaceSummary = ReturnType<typeof buildDefaultTotalSpace>;

const normalizeAndValidateEmails = (emails: string[]) => {
  const sanitizedEmails: string[] = [];
  const invalidEmails: string[] = [];

  for (const rawEmail of emails) {
    const parsed = emailSchema.safeParse(rawEmail);

    if (parsed.success) {
      sanitizedEmails.push(parsed.data);
      continue;
    }

    if (String(rawEmail || "").trim().length > 0) {
      invalidEmails.push(rawEmail);
    }
  }

  return {
    sanitizedEmails: Array.from(new Set(sanitizedEmails)),
    invalidEmails,
  };
};

const isAppwriteNotFoundError = (error: unknown) => {
  if (typeof error !== "object" || !error) {
    return false;
  }

  return Number((error as { code?: unknown }).code) === 404;
};

const getApplicationBaseUrl = () => {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return "http://localhost:3000";
};

const requireCurrentUser = async (requestId: string) => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.clerkUserId) {
    logger.warn("Rejected action due to missing authenticated user", { requestId });
    throw new Error("Unauthorized");
  }

  return currentUser;
};

const ensureFileOwner = async (fileId: string, requestId: string) => {
  const currentUser = await requireCurrentUser(requestId);
  const file = await fileRepository.getById(fileId);

  if (file.clerkUserId !== currentUser.clerkUserId) {
    logger.warn("Ownership check failed", {
      requestId,
      userId: currentUser.clerkUserId,
      fileId,
    });
    throw new Error("Unauthorized");
  }

  return { file, currentUser };
};

const buildStoragePermissions = (
  ownerClerkUserId: string,
  sharedClerkUserIds: string[],
) => {
  const ownerAuthUserId = toAppwriteAuthUserId(ownerClerkUserId);
  const uniqueSharedAuthUserIds = Array.from(
    new Set(sharedClerkUserIds.map((id) => toAppwriteAuthUserId(id))),
  );

  return [
    Permission.read(Role.user(ownerAuthUserId)),
    Permission.update(Role.user(ownerAuthUserId)),
    Permission.delete(Role.user(ownerAuthUserId)),
    ...uniqueSharedAuthUserIds.map((id) => Permission.read(Role.user(id))),
  ];
};

const getSharedClerkUserIds = async (emails: string[]) => {
  const users = await Promise.all(
    emails.map(async (email) => userRepository.getByEmail(email)),
  );

  return users
    .map((user) => (user?.clerkUserId ? String(user.clerkUserId) : null))
    .filter((clerkUserId): clerkUserId is string => Boolean(clerkUserId));
};

const revalidateFileTags = (clerkUserId: string, fileId?: string) => {
  revalidateTag("files");
  revalidateTag(`user:${clerkUserId}`);

  if (fileId) {
    revalidateTag(`file:${fileId}`);
  }
};

export const createFileMetadata = async ({
  bucketFileId,
  fileName,
  size,
  path,
}: CreateFileMetadataProps) => {
  const requestId = createRequestId();

  try {
    const currentUser = await requireCurrentUser(requestId);
    const existing = await fileRepository.getByBucketFieldAndOwner({
      bucketFileId,
      clerkUserId: currentUser.clerkUserId,
    });

    if (existing) {
      logger.info("Reused existing file metadata for uploaded object", {
        requestId,
        userId: currentUser.clerkUserId,
        route: "file.actions.createFileMetadata",
        fileId: existing.$id,
      });

      return parseStringify(existing);
    }

    const { storage } = await createAdminClient();
    let storageFile;

    try {
      storageFile = await storage.getFile(appwriteConfig.bucketId, bucketFileId);
    } catch (error) {
      if (isAppwriteNotFoundError(error)) {
        logger.warn("Upload reconciliation failed: storage object not found", {
          requestId,
          userId: currentUser.clerkUserId,
          route: "file.actions.createFileMetadata",
          bucketFileId,
        });

        throw new Error("Uploaded file could not be verified");
      }

      throw error;
    }

    const verifiedFileName = String(storageFile.name || fileName);
    const verifiedFileSize =
      Number.isFinite(Number(storageFile.sizeOriginal))
        ? Number(storageFile.sizeOriginal)
        : size;

    if (verifiedFileName !== fileName || verifiedFileSize !== size) {
      logger.warn("Upload reconciliation normalized file metadata from storage", {
        requestId,
        userId: currentUser.clerkUserId,
        route: "file.actions.createFileMetadata",
        providedFileName: fileName,
        verifiedFileName,
        providedSize: size,
        verifiedFileSize,
      });
    }

    const fileType = getFileType(verifiedFileName);
    const documentId = ID.unique();
    const fileViewUrl = new URL(
      `/api/files/download/${documentId}?mode=view`,
      getApplicationBaseUrl(),
    ).toString();

    const fileDocument = {
      type: fileType.type,
      name: verifiedFileName,
      url: fileViewUrl,
      extension: fileType.extension,
      size: verifiedFileSize,
      clerkUserId: currentUser.clerkUserId,
      ownerName: currentUser.fullName,
      users: [],
      bucketField: bucketFileId,
    };

    const created = await fileRepository.createMetadata({
      id: documentId,
      data: fileDocument,
    });

    revalidatePath(path);
    revalidateFileTags(currentUser.clerkUserId, documentId);

    await Promise.all([
      invalidateFileAndUserCaches({
        ownerUserId: currentUser.clerkUserId,
        invalidateOwnerDashboard: true,
      }),
      incrementUploadCount(currentUser.clerkUserId),
    ]);

    logger.info("Stored uploaded file metadata", {
      requestId,
      userId: currentUser.clerkUserId,
      route: "file.actions.createFileMetadata",
      fileId: documentId,
    });

    return parseStringify(created);
  } catch (error) {
    handleError(error, "Failed to store file metadata", {
      requestId,
      route: "file.actions.createFileMetadata",
    });
  }
};

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
  cursor,
}: GetFilesProps) => {
  const requestId = createRequestId();

  try {
    const currentUser = await requireCurrentUser(requestId);
    const resolvedLimit = typeof limit === "number" ? limit : 20;
    const cacheFingerprint = createUserFilesCacheFingerprint({
      types,
      searchText,
      sort,
      limit: resolvedLimit,
      cursor,
    });
    const cacheKey = buildUserFilesCacheKey(
      currentUser.clerkUserId,
      cacheFingerprint,
    );
    const cachedFiles = await getCachedJson<Record<string, unknown>>(cacheKey);

    if (cachedFiles) {
      return parseStringify(cachedFiles);
    }

    const files = await fileRepository.listFiles({
      principal: {
        clerkUserId: currentUser.clerkUserId,
        email: currentUser.email,
      },
      types,
      searchText,
      sort,
      limit: resolvedLimit,
      cursor,
    });

    await setCachedJson(cacheKey, files, {
      ttlSeconds: CACHE_TTL_SECONDS.userFiles,
      userFilesIndexUserId: currentUser.clerkUserId,
    });

    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to get files", {
      requestId,
      route: "file.actions.getFiles",
    });
  }
};

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const requestId = createRequestId();

  try {
    const { storage } = await createAdminClient();
    const { file, currentUser } = await ensureFileOwner(fileId, requestId);
    const relatedSharedUserIds = await getSharedClerkUserIds(
      Array.isArray(file.users)
        ? file.users
            .map((email) => String(email || "").trim().toLowerCase())
            .filter((email) => email.length > 0)
        : [],
    );

    const newName = `${name}.${extension}`;
    const previousName = String(file.name || "");

    await storage.updateFile(appwriteConfig.bucketId, file.bucketField, newName);

    let updatedFile;

    try {
      updatedFile = await fileRepository.updateMetadata(fileId, {
        name: newName,
      });
    } catch (metadataError) {
      try {
        await storage.updateFile(
          appwriteConfig.bucketId,
          file.bucketField,
          previousName,
        );
      } catch (rollbackError) {
        logger.error(
          "Failed to rollback storage filename after metadata update error",
          {
            requestId,
            userId: currentUser.clerkUserId,
            route: "file.actions.renameFile",
            fileId,
          },
          rollbackError,
        );
      }

      throw metadataError;
    }

    revalidatePath(path);
    revalidateFileTags(currentUser.clerkUserId, fileId);

    await invalidateFileAndUserCaches({
      fileId,
      ownerUserId: currentUser.clerkUserId,
      relatedUserIds: relatedSharedUserIds,
    });

    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to rename file", {
      requestId,
      route: "file.actions.renameFile",
    });
  }
};

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const requestId = createRequestId();

  try {
    const { storage } = await createAdminClient();
    const { file, currentUser } = await ensureFileOwner(fileId, requestId);

    const previousEmails = Array.isArray(file.users)
      ? file.users
          .map((email) => String(email || "").trim().toLowerCase())
          .filter((email) => email.length > 0)
      : [];

    const { sanitizedEmails, invalidEmails } = normalizeAndValidateEmails(emails);

    if (invalidEmails.length > 0) {
      logger.warn("Rejected share update due to invalid emails", {
        requestId,
        userId: currentUser.clerkUserId,
        route: "file.actions.updateFileUsers",
        fileId,
        invalidEmails,
      });
      throw new Error("Invalid email list");
    }

    const previousSharedClerkUserIds = await getSharedClerkUserIds(previousEmails);
    const sharedClerkUserIds = await getSharedClerkUserIds(sanitizedEmails);

    await fileRepository.upsertFileShares({
      fileId,
      ownerId: currentUser.clerkUserId,
      principals: [...sanitizedEmails, ...sharedClerkUserIds],
    });

    const updatedFile = await fileRepository.updateMetadata(fileId, {
      users: sanitizedEmails,
    });

    const permissions = buildStoragePermissions(
      currentUser.clerkUserId,
      sharedClerkUserIds,
    );

    try {
      await storage.updateFile(
        appwriteConfig.bucketId,
        file.bucketField,
        undefined,
        permissions,
      );
    } catch (storageError) {
      try {
        await fileRepository.upsertFileShares({
          fileId,
          ownerId: currentUser.clerkUserId,
          principals: [...previousEmails, ...previousSharedClerkUserIds],
        });
        await fileRepository.updateMetadata(fileId, { users: previousEmails });
      } catch (rollbackError) {
        logger.error(
          "Failed to rollback file share metadata after storage permission error",
          {
            requestId,
            userId: currentUser.clerkUserId,
            route: "file.actions.updateFileUsers",
            fileId,
          },
          rollbackError,
        );
      }

      throw storageError;
    }

    revalidatePath(path);
    revalidateFileTags(currentUser.clerkUserId, fileId);

    await invalidateFileAndUserCaches({
      fileId,
      ownerUserId: currentUser.clerkUserId,
      relatedUserIds: Array.from(
        new Set([...previousSharedClerkUserIds, ...sharedClerkUserIds]),
      ),
    });

    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to update file users", {
      requestId,
      route: "file.actions.updateFileUsers",
    });
  }
};

export const deleteFile = async ({ fileId, path }: DeleteFileProps) => {
  const requestId = createRequestId();

  try {
    const { storage } = await createAdminClient();
    const { file, currentUser } = await ensureFileOwner(fileId, requestId);
    const relatedSharedUserIds = await getSharedClerkUserIds(
      Array.isArray(file.users)
        ? file.users
            .map((email) => String(email || "").trim().toLowerCase())
            .filter((email) => email.length > 0)
        : [],
    );

    try {
      await storage.deleteFile(appwriteConfig.bucketId, file.bucketField);
    } catch (storageError) {
      if (!isAppwriteNotFoundError(storageError)) {
        throw storageError;
      }

      logger.warn("Storage object already missing during delete", {
        requestId,
        userId: currentUser.clerkUserId,
        route: "file.actions.deleteFile",
        fileId,
        bucketFileId: file.bucketField,
      });
    }

    await fileRepository.deleteMetadata(fileId);

    revalidatePath(path);
    revalidateFileTags(currentUser.clerkUserId, fileId);

    await invalidateFileAndUserCaches({
      fileId,
      ownerUserId: currentUser.clerkUserId,
      relatedUserIds: relatedSharedUserIds,
      invalidateOwnerDashboard: true,
    });

    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to delete file", {
      requestId,
      route: "file.actions.deleteFile",
    });
  }
};

export async function getTotalSpaceUsed() {
  const requestId = createRequestId();

  try {
    const currentUser = await requireCurrentUser(requestId);
    const cacheKey = buildDashboardCacheKey(currentUser.clerkUserId);
    const cachedTotalSpace = await getCachedJson<TotalSpaceSummary>(cacheKey);

    if (cachedTotalSpace) {
      return parseStringify(cachedTotalSpace);
    }

    const files = await fileRepository.listOwnedFiles(currentUser.clerkUserId);

    const totalSpace = buildDefaultTotalSpace();

    files.documents.forEach((file) => {
      const fileType = file.type as FileType;
      const size = Number(file.size) || 0;
      const latestDate = String(file.$createdAt || "");

      totalSpace[fileType].size += size;

      if (latestDate > totalSpace[fileType].latestDate) {
        totalSpace[fileType].latestDate = latestDate;
      }

      totalSpace.used += size;
    });

    await setCachedJson(cacheKey, totalSpace, {
      ttlSeconds: CACHE_TTL_SECONDS.dashboard,
    });

    return parseStringify(totalSpace);
  } catch (error) {
    logger.error("Error calculating total space used", {
      requestId,
      route: "file.actions.getTotalSpaceUsed",
    }, error);
    return buildDefaultTotalSpace();
  }
}

export const getFileTypeBreakdown = async () => {
  const requestId = createRequestId();

  try {
    const currentUser = await requireCurrentUser(requestId);
    const { databases } = await createAdminClient();

    return databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal("clerkUserId", [currentUser.clerkUserId]), Query.limit(200)],
    );
  } catch (error) {
    handleError(error, "Failed to list file type breakdown", {
      requestId,
      route: "file.actions.getFileTypeBreakdown",
    });
  }
};
