// ✅ FORCE LOAD ENV (VERY IMPORTANT)
require("dotenv").config({ path: ".env.local" });

const { Client, Databases, Storage, ID, Permission, Role } = require("node-appwrite");

const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

// 🔹 Debug (keep this for now)
console.log("DATABASE_ID:", process.env.NEXT_PUBLIC_APPWRITE_DATABASE);
console.log("PROJECT:", APPWRITE_PROJECT_ID);
console.log("ENDPOINT:", process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
console.log("KEY EXISTS:", !!process.env.NEXT_APPWRITE_KEY);

// 🔹 Helper delay
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 🔹 Init client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(process.env.NEXT_APPWRITE_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION;
const FILES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION;
const FILE_SHARES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION;
const MAX_UPLOAD_SIZE_BYTES = Number(
  process.env.NEXT_PUBLIC_APPWRITE_MAX_UPLOAD_SIZE || 50 * 1024 * 1024,
);
const BUCKET_NAME = "files-bucket";
const ALLOWED_FILE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "webp",
  "pdf",
  "doc",
  "docx",
  "txt",
  "csv",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "mp4",
  "webm",
  "mov",
  "mp3",
  "wav",
  "ogg",
  "zip",
];

const buildBucketPermissions = () => [Permission.create(Role.users())];

async function resolveExistingCollection(preferredId, fallbackName) {
  if (preferredId) {
    try {
      const byId = await databases.getCollection(DATABASE_ID, preferredId);
      return byId;
    } catch {
      console.log(`⚠️ Env collection id not found for ${fallbackName}:`, preferredId);
    }
  }

  const list = await databases.listCollections(DATABASE_ID);
  const byName = list.collections.find((c) => c.name === fallbackName);

  return byName || null;
}

async function createIndexIfNeeded(collectionId, key, type, attributes, orders) {
  try {
    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      key,
      type,
      attributes,
      orders,
    );
    console.log(`✅ Added index: ${collectionId}.${key}`);
    await sleep(1000);
  } catch {
    console.log(`⚠️ Skipped index ${collectionId}.${key}`);
  }
}

// ==============================
// 🧱 USERS COLLECTION
// ==============================
async function setupUsersCollection() {
  let collectionId;

  const existing = await resolveExistingCollection(USERS_COLLECTION_ID, "users");

  if (existing) {
    collectionId = existing.$id;
    console.log("ℹ️ Reusing users collection:", collectionId);
  } else {
    const res = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      "users"
    );
    collectionId = res.$id;
    console.log("✅ Users collection created:", collectionId);
  }

  if (!collectionId) throw new Error("Users collection not found");

  console.log("⏳ Waiting for collection...");
  await sleep(4000);

  const attributes = [
    ["fullName", () => databases.createStringAttribute(DATABASE_ID, collectionId, "fullName", 255, true)],
    ["email", () => databases.createEmailAttribute(DATABASE_ID, collectionId, "email", true)],
    ["avatar", () => databases.createUrlAttribute(DATABASE_ID, collectionId, "avatar", true)],
    ["clerkUserId", () => databases.createStringAttribute(DATABASE_ID, collectionId, "clerkUserId", 255, true)],
  ];

  for (const [name, fn] of attributes) {
    try {
      await fn();
      console.log(`✅ Added attribute: ${name}`);
      await sleep(1200);
    } catch {
      console.log(`⚠️ Skipped ${name}`);
    }
  }

  return collectionId;
}

// ==============================
// 📂 FILES COLLECTION
// ==============================
async function setupFilesCollection() {
  let collectionId;

  const existing = await resolveExistingCollection(FILES_COLLECTION_ID, "files");

  if (existing) {
    collectionId = existing.$id;
    console.log("ℹ️ Reusing files collection:", collectionId);
  } else {
    const res = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      "files"
    );
    collectionId = res.$id;
    console.log("✅ Files collection created:", collectionId);
  }

  if (!collectionId) throw new Error("Files collection not found");

  console.log("⏳ Waiting for collection...");
  await sleep(4000);

  const attributes = [
    ["name", () => databases.createStringAttribute(DATABASE_ID, collectionId, "name", 255, true)],
    ["type", () => databases.createStringAttribute(DATABASE_ID, collectionId, "type", 100, true)],
    ["extension", () => databases.createStringAttribute(DATABASE_ID, collectionId, "extension", 20, true)],
    ["url", () => databases.createUrlAttribute(DATABASE_ID, collectionId, "url", true)],
    ["size", () => databases.createIntegerAttribute(DATABASE_ID, collectionId, "size", true)],
    ["clerkUserId", () => databases.createStringAttribute(DATABASE_ID, collectionId, "clerkUserId", 255, true)],
    ["ownerName", () => databases.createStringAttribute(DATABASE_ID, collectionId, "ownerName", 255, true)],
    ["bucketField", () => databases.createStringAttribute(DATABASE_ID, collectionId, "bucketField", 255, true)],
    [
      "users[]",
      () =>
        databases.createStringAttribute(
          DATABASE_ID,
          collectionId,
          "users",
          255,
          false,
          undefined,
          true
        ),
    ],
  ];

  for (const [name, fn] of attributes) {
    try {
      await fn();
      console.log(`✅ Added attribute: ${name}`);
      await sleep(1200);
    } catch {
      console.log(`⚠️ Skipped ${name}`);
    }
  }

  await createIndexIfNeeded(
    collectionId,
    "idx_files_owner_created",
    "key",
    ["clerkUserId", "$createdAt"],
    ["ASC", "DESC"],
  );

  await createIndexIfNeeded(
    collectionId,
    "idx_files_type_created",
    "key",
    ["type", "$createdAt"],
    ["ASC", "DESC"],
  );

  return collectionId;
}

// ==============================
// 🤝 FILE SHARES COLLECTION
// ==============================
async function setupFileSharesCollection() {
  let collectionId;

  const existing = await resolveExistingCollection(
    FILE_SHARES_COLLECTION_ID,
    "file_shares",
  );

  if (existing) {
    collectionId = existing.$id;
    console.log("ℹ️ Reusing file_shares collection:", collectionId);
  } else {
    const res = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      "file_shares"
    );
    collectionId = res.$id;
    console.log("✅ File shares collection created:", collectionId);
  }

  if (!collectionId) throw new Error("File shares collection not found");

  console.log("⏳ Waiting for collection...");
  await sleep(4000);

  const attributes = [
    ["fileId", () => databases.createStringAttribute(DATABASE_ID, collectionId, "fileId", 255, true)],
    ["principal", () => databases.createStringAttribute(DATABASE_ID, collectionId, "principal", 255, true)],
    ["role", () => databases.createStringAttribute(DATABASE_ID, collectionId, "role", 32, true)],
    ["status", () => databases.createStringAttribute(DATABASE_ID, collectionId, "status", 32, true)],
    ["ownerId", () => databases.createStringAttribute(DATABASE_ID, collectionId, "ownerId", 255, true)],
    ["type", () => databases.createStringAttribute(DATABASE_ID, collectionId, "type", 64, true)],
  ];

  for (const [name, fn] of attributes) {
    try {
      await fn();
      console.log(`✅ Added attribute: ${name}`);
      await sleep(1200);
    } catch {
      console.log(`⚠️ Skipped ${name}`);
    }
  }

  await createIndexIfNeeded(
    collectionId,
    "idx_file_shares_fileId",
    "key",
    ["fileId"],
    ["ASC"],
  );

  await createIndexIfNeeded(
    collectionId,
    "idx_file_shares_ownerId",
    "key",
    ["ownerId"],
    ["ASC"],
  );

  await createIndexIfNeeded(
    collectionId,
    "idx_file_shares_type",
    "key",
    ["type"],
    ["ASC"],
  );

  await createIndexIfNeeded(
    collectionId,
    "idx_file_shares_createdAt",
    "key",
    ["$createdAt"],
    ["DESC"],
  );

  return collectionId;
}

// ==============================
// 🪣 STORAGE BUCKET
// ==============================
async function setupBucket() {
  const bucketPermissions = buildBucketPermissions();

  const applyBucketSecurity = async (bucketId, name, enabled, compression, encryption, antivirus) => {
    await storage.updateBucket(
      bucketId,
      name,
      bucketPermissions,
      true,
      enabled,
      MAX_UPLOAD_SIZE_BYTES,
      ALLOWED_FILE_EXTENSIONS,
      compression,
      encryption,
      antivirus,
    );
  };

  try {
    const existingBucketId = process.env.NEXT_PUBLIC_APPWRITE_BUCKET;

    if (existingBucketId) {
      try {
        const existingBucket = await storage.getBucket(existingBucketId);

        await applyBucketSecurity(
          existingBucket.$id,
          existingBucket.name,
          existingBucket.enabled,
          existingBucket.compression,
          existingBucket.encryption,
          existingBucket.antivirus,
        );

        console.log("✅ Bucket security updated:", existingBucket.$id);
        return;
      } catch (error) {
        console.log("⚠️ Could not update bucket by NEXT_PUBLIC_APPWRITE_BUCKET, creating a new one");
        if (error?.message) {
          console.log("ℹ️ Reason:", error.message);
        }
      }
    }

    const created = await storage.createBucket(
      ID.unique(),
      BUCKET_NAME,
      bucketPermissions,
      true,
      true,
      MAX_UPLOAD_SIZE_BYTES,
      ALLOWED_FILE_EXTENSIONS,
      "none",
      true,
      true,
    );

    console.log("✅ Bucket created:", created.$id);
    console.log("ℹ️ Set NEXT_PUBLIC_APPWRITE_BUCKET to:", created.$id);
  } catch (error) {
    console.log("⚠️ Bucket setup failed");
    if (error?.message) {
      console.log("ℹ️ Reason:", error.message);
    }
  }
}

// ==============================
// 🚀 MAIN
// ==============================
(async () => {
  try {
    console.log("\n🚀 Starting Appwrite setup...\n");

    if (!DATABASE_ID) {
      throw new Error("DATABASE_ID is missing in env");
    }

    if (!APPWRITE_PROJECT_ID) {
      throw new Error("APPWRITE project ID is missing in env");
    }

    const usersId = await setupUsersCollection();
    const filesId = await setupFilesCollection();
    const fileSharesId = await setupFileSharesCollection();
    await setupBucket();

    console.log("\n🎉 Setup Completed!");
    console.log("Users Collection ID:", usersId);
    console.log("Files Collection ID:", filesId);
    console.log("File Shares Collection ID:", fileSharesId);

  } catch (err) {
    console.error("❌ Setup failed:", err.message);
  }
})();