import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Query } from "node-appwrite";
import { unstable_cache } from "next/cache";

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

const parseSort = (sort: string) => {
  const [sortBy = "$createdAt", orderBy = "desc"] = sort.split("-");
  return { sortBy, orderBy };
};

const listSharedFileIds = async (principal: Principal) => {
  if (!fileSharesCollectionId) {
    return [];
  }

  const { databases } = await createAdminClient();

  try {
    const shares = await databases.listDocuments(
      appwriteConfig.databaseId,
      fileSharesCollectionId,
      [
        Query.equal("status", ["active"]),
        Query.or([
          Query.equal("principal", [principal.clerkUserId]),
          Query.equal("principal", [principal.email]),
        ]),
        Query.limit(100),
      ],
    );

    return Array.from(
      new Set(shares.documents.map((share) => share.fileId).filter(Boolean)),
    );
  } catch {
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
    const cacheKey = [
      "files",
      principal.clerkUserId,
      principal.email,
      types.join(","),
      searchText,
      sort,
      String(limit),
      cursor ?? "",
    ];

    return unstable_cache(
      async () => {
        const { databases } = await createAdminClient();
        const sharedFileIds = await listSharedFileIds(principal);

        const visibilityQueries: string[] = [
          Query.equal("clerkUserId", [principal.clerkUserId]),
        ];

        if (sharedFileIds.length > 0) {
          visibilityQueries.push(Query.equal("$id", sharedFileIds.slice(0, 100)));
        } else if (!fileSharesCollectionId) {
          // Backward compatibility while shared data migrates to file_shares.
          visibilityQueries.push(Query.contains("users", [principal.email]));
        }

        const queries = [Query.or(visibilityQueries), Query.limit(limit)];

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
          result.documents.length === limit
            ? result.documents[result.documents.length - 1]?.$id
            : null;

        return {
          ...result,
          nextCursor,
        };
      },
      cacheKey,
      {
        tags: ["files", `user:${principal.clerkUserId}`],
      },
    )();
  },

  getById: async (fileId: string) => {
    return unstable_cache(
      async () => {
        const { databases } = await createAdminClient();
        return databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.filesCollectionId,
          fileId,
        );
      },
      ["file", fileId],
      { tags: [`file:${fileId}`] },
    )();
  },

  createMetadata: async ({
    id,
    data,
  }: {
    id?: string;
    data: Record<string, unknown>;
  }) => {
    const { databases } = await createAdminClient();
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      id ?? ID.unique(),
      data,
    );
  },

  updateMetadata: async (fileId: string, data: Record<string, unknown>) => {
    const { databases } = await createAdminClient();
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      data,
    );
  },

  deleteMetadata: async (fileId: string) => {
    const { databases } = await createAdminClient();
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
    );
  },

  listOwnedFiles: async (clerkUserId: string) => {
    const { databases } = await createAdminClient();
    return databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal("clerkUserId", [clerkUserId]), Query.limit(200)],
    );
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
    } catch {
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
    } catch {
      return;
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
          ),
        ),
    );
  },
};
