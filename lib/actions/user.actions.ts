"use server";

import { auth, currentUser as getClerkCurrentUser } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";

import { avatarPlaceholderUrl } from "@/constants";
import { parseStringify } from "@/lib/utils";
import { userRepository } from "@/lib/repositories/user.repository";
import { createRequestId, logger } from "@/lib/observability/logger";

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

  const userDocument = await userRepository.createFromClerkProfile({
    fullName,
    email,
    avatar: clerkUser.imageUrl || avatarPlaceholderUrl,
    clerkUserId,
  });

  revalidateTag(`user:${clerkUserId}`);
  return userDocument;
};

export const getCurrentUser = async () => {
  const requestId = createRequestId();

  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    const existingUser = await userRepository.getByClerkUserId(userId);

    if (existingUser) {
      return parseStringify(existingUser);
    }

    const newUser = await createAppwriteUserFromClerk(userId);

    if (!newUser) {
      return null;
    }

    logger.info("Provisioned Appwrite profile from Clerk identity", {
      requestId,
      userId,
      route: "user.actions.getCurrentUser",
    });

    return parseStringify(newUser);
  } catch (error) {
    logger.error(
      "Failed to resolve current user",
      { requestId, route: "user.actions.getCurrentUser" },
      error,
    );
    return null;
  }
};
