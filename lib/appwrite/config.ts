const appwriteProjectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export const appwriteConfig = {
  endpointUrl: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: appwriteProjectId!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
  filesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
  fileSharesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION,
  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
  secretKey: process.env.NEXT_APPWRITE_KEY!,
  maxUploadSizeBytes: Number(process.env.NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE || 50 * 1024 * 1024),
};
