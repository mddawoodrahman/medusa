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

const getEnv = (...names: string[]) => {
  for (const name of names) {
    const value = normalizeEnvValue(process.env[name]);

    if (value) {
      return value;
    }
  }

  return undefined;
};

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const appwriteProjectId =
  getEnv(
    "NEXT_PUBLIC_APPWRITE_PROJECT",
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    "APPWRITE_PROJECT_ID",
  );

export const appwriteConfig = {
  endpointUrl: getEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT", "APPWRITE_ENDPOINT")!,
  projectId: appwriteProjectId!,
  databaseId: getEnv("NEXT_PUBLIC_APPWRITE_DATABASE", "APPWRITE_DATABASE_ID")!,
  usersCollectionId: getEnv(
    "NEXT_PUBLIC_APPWRITE_USERS_COLLECTION",
    "APPWRITE_USERS_COLLECTION_ID",
  )!,
  filesCollectionId: getEnv(
    "NEXT_PUBLIC_APPWRITE_FILES_COLLECTION",
    "APPWRITE_FILES_COLLECTION_ID",
  )!,
  fileSharesCollectionId: getEnv(
    "NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION",
    "APPWRITE_FILE_SHARES_COLLECTION_ID",
  ),
  bucketId: getEnv("NEXT_PUBLIC_APPWRITE_BUCKET", "APPWRITE_BUCKET_ID")!,
  secretKey: getEnv("NEXT_APPWRITE_KEY", "APPWRITE_API_KEY", "APPWRITE_KEY")!,
  maxUploadSizeBytes: toPositiveInt(
    getEnv("NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE", "APPWRITE_MAX_UPLOAD_SIZE"),
    50 * 1024 * 1024,
  ),
};
