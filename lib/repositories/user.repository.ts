import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { toAppwriteAuthUserId } from "@/lib/appwrite/auth-user";
import { ID, Permission, Query, Role } from "node-appwrite";

type CreateUserInput = {
  clerkUserId: string;
  fullName: string;
  email: string;
  avatar: string;
};

const usersCollectionId = appwriteConfig.usersCollectionId;

export const userRepository = {
  getByClerkUserId: async (clerkUserId: string) => {
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      usersCollectionId,
      [Query.equal("clerkUserId", [clerkUserId]), Query.limit(1)],
    );

    return result.documents[0] ?? null;
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

    const existing = await databases.listDocuments(
      appwriteConfig.databaseId,
      usersCollectionId,
      [Query.equal("clerkUserId", [clerkUserId]), Query.limit(1)],
    );

    if (existing.total > 0) {
      return existing.documents[0];
    }

    const ownerAuthUserId = toAppwriteAuthUserId(clerkUserId);
    const permissions = [
      Permission.read(Role.user(ownerAuthUserId)),
      Permission.write(Role.user(ownerAuthUserId)),
    ];

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
      permissions,
    );
  },
};
