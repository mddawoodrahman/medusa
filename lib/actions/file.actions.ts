"use server";

import { ID, Permission, Query, Role } from "node-appwrite";
import { revalidatePath, revalidateTag } from "next/cache";

import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite";
import { toAppwriteAuthUserId } from "@/lib/appwrite/auth-user";
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
    const fileType = getFileType(fileName);
    const documentId = ID.unique();

    const fileDocument = {
      type: fileType.type,
      name: fileName,
      url: `/api/files/download/${documentId}?mode=view`,
      extension: fileType.extension,
      size,
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

    const files = await fileRepository.listFiles({
      principal: {
        clerkUserId: currentUser.clerkUserId,
        email: currentUser.email,
      },
      types,
      searchText,
      sort,
      limit,
      cursor,
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

    const newName = `${name}.${extension}`;

    await storage.updateFile(appwriteConfig.bucketId, file.bucketField, newName);

    const updatedFile = await fileRepository.updateMetadata(fileId, {
      name: newName,
    });

    revalidatePath(path);
    revalidateFileTags(currentUser.clerkUserId, fileId);

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

    const sanitizedEmails = Array.from(
      new Set(
        emails
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email.length > 0),
      ),
    );

    const sharedClerkUserIds = await getSharedClerkUserIds(sanitizedEmails);
    const permissions = buildStoragePermissions(
      currentUser.clerkUserId,
      sharedClerkUserIds,
    );

    await storage.updateFile(
      appwriteConfig.bucketId,
      file.bucketField,
      undefined,
      permissions,
    );

    await fileRepository.upsertFileShares({
      fileId,
      ownerId: currentUser.clerkUserId,
      principals: [...sanitizedEmails, ...sharedClerkUserIds],
    });

    const updatedFile = await fileRepository.updateMetadata(fileId, {
      users: sanitizedEmails,
    });

    revalidatePath(path);
    revalidateFileTags(currentUser.clerkUserId, fileId);

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

    await fileRepository.deleteMetadata(fileId);
    await storage.deleteFile(appwriteConfig.bucketId, file.bucketField);

    revalidatePath(path);
    revalidateFileTags(currentUser.clerkUserId, fileId);

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

    const files = await fileRepository.listOwnedFiles(currentUser.clerkUserId);

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024,
    };

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

    return parseStringify(totalSpace);
  } catch (error) {
    logger.error("Error calculating total space used", {
      requestId,
      route: "file.actions.getTotalSpaceUsed",
    }, error);
    return null;
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
