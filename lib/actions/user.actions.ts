"use server";

import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query, ID } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { avatarPlaceholderUrl } from "@/constants";
import { auth, currentUser as getClerkCurrentUser } from "@clerk/nextjs/server";

const getUserByClerkId = async (clerkUserId: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("clerkUserId", [clerkUserId])],
  );

  return result.total > 0 ? result.documents[0] : null;
};

const createAppwriteUserFromClerk = async (clerkUserId: string) => {
  const clerkUser = await getClerkCurrentUser();

  if (!clerkUser) {
    return null;
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Clerk user has no email address");
  }

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email.split("@")[0];

  const { databases } = await createAdminClient();

  const userDocument = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    ID.unique(),
    {
      fullName,
      email,
      avatar: clerkUser.imageUrl || avatarPlaceholderUrl,
      clerkUserId,
    },
  );

  return userDocument;
};

export const getCurrentUser = async () => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    const existingUser = await getUserByClerkId(userId);

    if (existingUser) {
      return parseStringify(existingUser);
    }

    const newUser = await createAppwriteUserFromClerk(userId);

    if (!newUser) {
      return null;
    }

    return parseStringify(newUser);
  } catch (error) {
    console.log(error);
    return null;
  }
};
