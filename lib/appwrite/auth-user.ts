import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/appwrite";

type AuthUserSeed = {
  clerkUserId: string;
  email: string;
  fullName: string;
};

export const toAppwriteAuthUserId = (clerkUserId: string) => {
  const digest = createHash("sha256").update(clerkUserId).digest("hex");
  return `clerk_${digest.slice(0, 28)}`;
};

const createStrongPassword = () => randomBytes(24).toString("base64url");

export const ensureAppwriteAuthUser = async (user: AuthUserSeed) => {
  const { users } = await createAdminClient();
  const appwriteAuthUserId = toAppwriteAuthUserId(user.clerkUserId);

  try {
    await users.get(appwriteAuthUserId);
    return appwriteAuthUserId;
  } catch {
    await users.create(
      appwriteAuthUserId,
      user.email,
      undefined,
      createStrongPassword(),
      user.fullName,
    );

    return appwriteAuthUserId;
  }
};
