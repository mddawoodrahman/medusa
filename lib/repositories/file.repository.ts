import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { toAppwriteAuthUserId } from "@/lib/appwrite/auth-user";
import { ID, Permission, Query, Role } from "node-appwrite";
import { logger } from "@/lib/observability/logger";
import {
  buildFileCacheKey,
  CACHE_TTL_SECONDS,
  getCachedJson,
  invalidateFileMetadataCache,
  setCachedJson,
} from "@/lib/cache";

type Principal = {
  clerkUserId: string;
  email: string;
};

type ListFilesInput = {
  principal: Principal;
  types?: string[];
  searchText?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
};

type UpsertFileSharesInput = {
  fileId: string;
  ownerId: string;
  principals: string[];
};

const fileSharesCollectionId = appwriteConfig.fileSharesCollectionId;
const MAX_LIST_LIMIT = 100;
const MAX_SHARED_FILE_IDS = 1000;

const ALLOWED_SORT_FIELDS = new Set(["$createdAt", "name", "size"]);

const buildOwnerDocumentPermissions = (ownerClerkUserId: string) => {
  const ownerAuthUserId = toAppwriteAuthUserId(ownerClerkUserId);

  return [
    Permission.read(Role.user(ownerAuthUserId)),
    Permission.write(Role.user(ownerAuthUserId)),
  ];
};

const buildFileShareDocumentPermissions = (
  ownerClerkUserId: string,
  principal: string,
) => {
  const permissions = [...buildOwnerDocumentPermissions(ownerClerkUserId)];

  if (!principal.includes("@")) {
    permissions.push(
      Permission.read(Role.user(toAppwriteAuthUserId(principal))),
    );
  }

  return Array.from(new Set(permissions));
};

const parseSort = (sort: string) => {
  const [rawSortBy = "$createdAt", rawOrderBy = "desc"] = sort.split("-");
  const sortBy = ALLOWED_SORT_FIELDS.has(rawSortBy) ? rawSortBy : "$createdAt";
  const orderBy = rawOrderBy === "asc" ? "asc" : "desc";

  return { sortBy, orderBy };
};

const clampListLimit = (limit: number) => {
  if (!Number.isFinite(limit)) {
    return 20;
  }

  return Math.min(MAX_LIST_LIMIT, Math.max(1, Math.floor(limit)));
};

const listSharedFileIds = async (principal: Principal) => {
  if (!fileSharesCollectionId) {
    return [];
  }

  const { databases } = await createAdminClient();

  try {
    const collectedIds = new Set<string>();
    let cursor: string | undefined;

    while (collectedIds.size < MAX_SHARED_FILE_IDS) {
      const queries = [
        Query.equal("status", ["active"]),
        Query.or([
          Query.equal("principal", [principal.clerkUserId]),
          Query.equal("principal", [principal.email]),
        ]),
        Query.limit(MAX_LIST_LIMIT),
      ];

      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const shares = await databases.listDocuments(
        appwriteConfig.databaseId,
        fileSharesCollectionId,
        queries,
      );

      for (const share of shares.documents) {
        if (share.fileId) {
          collectedIds.add(String(share.fileId));
        }
      }

      if (shares.documents.length < MAX_LIST_LIMIT) {
        break;
      }

      cursor = shares.documents[shares.documents.length - 1]?.$id;

      if (!cursor) {
        break;
      }
    }

    return Array.from(collectedIds);
  } catch (error) {
    logger.error("Failed to resolve shared file ids", {
      route: "file.repository.listSharedFileIds",
      userId: principal.clerkUserId,
    }, error);
    return [];
  }
};

export const fileRepository = {
  listFiles: async ({
    principal,
    types = [],
    searchText = "",
    sort = "$createdAt-desc",
    limit = 20,
    cursor,
  }: ListFilesInput) => {
    const { databases } = await createAdminClient();
    const sharedFileIds = await listSharedFileIds(principal);
    const resolvedLimit = clampListLimit(limit);

    const visibilityQueries: string[] = [
      Query.equal("clerkUserId", [principal.clerkUserId]),
    ];

    if (sharedFileIds.length > 0) {
      visibilityQueries.push(Query.equal("$id", sharedFileIds));
    } else if (!fileSharesCollectionId) {
      // Backward compatibility while shared data migrates to file_shares.
      visibilityQueries.push(Query.contains("users", [principal.email]));
    }

    const queries = [Query.or(visibilityQueries), Query.limit(resolvedLimit)];

    if (types.length > 0) {
      queries.push(Query.equal("type", types));
    }

    if (searchText) {
      queries.push(Query.contains("name", searchText));
    }

    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    const { sortBy, orderBy } = parseSort(sort);

    queries.push(
      orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
    );

    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries,
    );

    const nextCursor =
      result.documents.length === resolvedLimit
        ? result.documents[result.documents.length - 1]?.$id
        : null;

    return {
      ...result,
      nextCursor,
    };
  },

  getById: async (fileId: string) => {
    const cacheKey = buildFileCacheKey(fileId);
    const cached = await getCachedJson<Record<string, unknown>>(cacheKey);

    if (cached) {
      return cached;
    }

    const { databases } = await createAdminClient();
    const document = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
    );

    await setCachedJson(cacheKey, document, {
      ttlSeconds: CACHE_TTL_SECONDS.fileMetadata,
    });

    return document;
  },

  getByBucketFieldAndOwner: async ({
    bucketFileId,
    clerkUserId,
  }: {
    bucketFileId: string;
    clerkUserId: string;
  }) => {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [
        Query.equal("bucketField", [bucketFileId]),
        Query.equal("clerkUserId", [clerkUserId]),
        Query.limit(1),
      ],
    );

    return result.documents[0] ?? null;
  },

  createMetadata: async ({
    id,
    data,
  }: {
    id?: string;
    data: Record<string, unknown>;
  }) => {
    const { databases } = await createAdminClient();
    const ownerClerkUserId =
      typeof data.clerkUserId === "string" ? data.clerkUserId : null;
    const permissions = ownerClerkUserId
      ? buildOwnerDocumentPermissions(ownerClerkUserId)
      : undefined;

    const document = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      id ?? ID.unique(),
      data,
      permissions,
    );

    await setCachedJson(buildFileCacheKey(document.$id), document, {
      ttlSeconds: CACHE_TTL_SECONDS.fileMetadata,
    });

    return document;
  },

  updateMetadata: async (fileId: string, data: Record<string, unknown>) => {
    const { databases } = await createAdminClient();
    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      data,
    );

    await setCachedJson(buildFileCacheKey(fileId), updated, {
      ttlSeconds: CACHE_TTL_SECONDS.fileMetadata,
    });

    return updated;
  },

  deleteMetadata: async (fileId: string) => {
    const { databases } = await createAdminClient();
    const result = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
    );

    await invalidateFileMetadataCache(fileId);

    return result;
  },

  listOwnedFiles: async (clerkUserId: string) => {
    const { databases } = await createAdminClient();

    const allDocuments: Record<string, unknown>[] = [];
    let cursor: string | undefined;

    while (true) {
      const queries = [
        Query.equal("clerkUserId", [clerkUserId]),
        Query.limit(MAX_LIST_LIMIT),
      ];

      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const page = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        queries,
      );

      allDocuments.push(...page.documents);

      if (page.documents.length < MAX_LIST_LIMIT) {
        return {
          ...page,
          documents: allDocuments,
          total: allDocuments.length,
        };
      }

      cursor = page.documents[page.documents.length - 1]?.$id;

      if (!cursor) {
        return {
          ...page,
          documents: allDocuments,
          total: allDocuments.length,
        };
      }
    }
  },

  canAccessFile: async (fileId: string, principal: Principal) => {
    const file = await fileRepository.getById(fileId);

    if (file.clerkUserId === principal.clerkUserId) {
      return true;
    }

    const legacyUsers = Array.isArray(file.users) ? file.users : [];

    if (legacyUsers.includes(principal.email)) {
      return true;
    }

    if (!fileSharesCollectionId) {
      return false;
    }

    const { databases } = await createAdminClient();

    try {
      const share = await databases.listDocuments(
        appwriteConfig.databaseId,
        fileSharesCollectionId,
        [
          Query.equal("fileId", [fileId]),
          Query.equal("status", ["active"]),
          Query.or([
            Query.equal("principal", [principal.clerkUserId]),
            Query.equal("principal", [principal.email]),
          ]),
          Query.limit(1),
        ],
      );

      return share.total > 0;
    } catch (error) {
      logger.error("Failed to verify file share access", {
        route: "file.repository.canAccessFile",
        userId: principal.clerkUserId,
        fileId,
      }, error);
      return false;
    }
  },

  upsertFileShares: async ({
    fileId,
    ownerId,
    principals,
  }: UpsertFileSharesInput) => {
    if (!fileSharesCollectionId) {
      return;
    }

    const { databases } = await createAdminClient();

    let existingDocuments: { $id: string; principal: string }[] = [];

    try {
      const existing = await databases.listDocuments(
        appwriteConfig.databaseId,
        fileSharesCollectionId,
        [Query.equal("fileId", [fileId]), Query.limit(200)],
      );

      existingDocuments = existing.documents.map((document) => ({
        $id: document.$id,
        principal: document.principal,
      }));
    } catch (error) {
      logger.error("Failed to list existing file share records", {
        route: "file.repository.upsertFileShares",
        ownerId,
        fileId,
      }, error);
      throw error;
    }

    const desired = new Set(principals.filter(Boolean));

    await Promise.all(
      existingDocuments
        .filter((document) => !desired.has(document.principal))
        .map((document) =>
          databases.deleteDocument(
            appwriteConfig.databaseId,
            fileSharesCollectionId,
            document.$id,
          ),
        ),
    );

    await Promise.all(
      principals
        .filter(Boolean)
        .filter(
          (principal) =>
            !existingDocuments.some((document) => document.principal === principal),
        )
        .map((principal) =>
          databases.createDocument(
            appwriteConfig.databaseId,
            fileSharesCollectionId,
            ID.unique(),
            {
              fileId,
              principal,
              role: "viewer",
              status: "active",
              ownerId,
              type: "direct",
            },
            buildFileShareDocumentPermissions(ownerId, principal),
          ),
        ),
    );
  },
};
