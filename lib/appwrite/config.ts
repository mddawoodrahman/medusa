const normalizeEnvValue = (value: string | undefined) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/^['"]|['"]$/g, "").trim();
};

const getEnv = (name: string) => normalizeEnvValue(process.env[name]);

const appwriteProjectId =
  getEnv("NEXT_PUBLIC_APPWRITE_PROJECT") ||
  getEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");

export const appwriteConfig = {
  endpointUrl: getEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT")!,
  projectId: appwriteProjectId!,
  databaseId: getEnv("NEXT_PUBLIC_APPWRITE_DATABASE")!,
  usersCollectionId: getEnv("NEXT_PUBLIC_APPWRITE_USERS_COLLECTION")!,
  filesCollectionId: getEnv("NEXT_PUBLIC_APPWRITE_FILES_COLLECTION")!,
  fileSharesCollectionId: getEnv("NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION"),
  bucketId: getEnv("NEXT_PUBLIC_APPWRITE_BUCKET")!,
  secretKey: getEnv("NEXT_APPWRITE_KEY")!,
  maxUploadSizeBytes: Number(
    getEnv("NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE") || 50 * 1024 * 1024,
  ),
};
