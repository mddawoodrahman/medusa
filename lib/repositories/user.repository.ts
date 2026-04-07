import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Query } from "node-appwrite";
import { unstable_cache } from "next/cache";

type CreateUserInput = {
  clerkUserId: string;
  fullName: string;
  email: string;
  avatar: string;
};

const usersCollectionId = appwriteConfig.usersCollectionId;

export const userRepository = {
  getByClerkUserId: async (clerkUserId: string) => {
    return unstable_cache(
      async () => {
        const { databases } = await createAdminClient();
        const result = await databases.listDocuments(
          appwriteConfig.databaseId,
          usersCollectionId,
          [Query.equal("clerkUserId", [clerkUserId]), Query.limit(1)],
        );

        return result.documents[0] ?? null;
      },
      ["user", "clerk", clerkUserId],
      { tags: [`user:${clerkUserId}`] },
    )();
  },

  getByEmail: async (email: string) => {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      usersCollectionId,
      [Query.equal("email", [email]), Query.limit(1)],
    );

    return result.documents[0] ?? null;
  },

  createFromClerkProfile: async ({
    clerkUserId,
    fullName,
    email,
    avatar,
  }: CreateUserInput) => {
    const { databases } = await createAdminClient();

    return databases.createDocument(
      appwriteConfig.databaseId,
      usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar,
        clerkUserId,
      },
    );
  },
};
