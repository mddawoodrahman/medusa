// ✅ FORCE LOAD ENV (VERY IMPORTANT)
require("dotenv").config({ path: ".env.local" });

const { Client, Databases, Storage, ID } = require("node-appwrite");

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

  try {
    const res = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      "users"
    );
    collectionId = res.$id;
    console.log("✅ Users collection created:", collectionId);
  } catch {
    console.log("⚠️ Users collection may already exist");

    const list = await databases.listCollections(DATABASE_ID);
    const existing = list.collections.find(c => c.name === "users");
    collectionId = existing?.$id;
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

  try {
    const res = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      "files"
    );
    collectionId = res.$id;
    console.log("✅ Files collection created:", collectionId);
  } catch {
    console.log("⚠️ Files collection may already exist");

    const list = await databases.listCollections(DATABASE_ID);
    const existing = list.collections.find(c => c.name === "files");
    collectionId = existing?.$id;
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

  try {
    const res = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      "file_shares"
    );
    collectionId = res.$id;
    console.log("✅ File shares collection created:", collectionId);
  } catch {
    console.log("⚠️ File shares collection may already exist");

    const list = await databases.listCollections(DATABASE_ID);
    const existing = list.collections.find((c) => c.name === "file_shares");
    collectionId = existing?.$id;
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
  try {
    const res = await storage.createBucket(
      ID.unique(),
      "files-bucket",
      ["jpg", "png", "pdf", "docx", "mp4"],
      true,
      true,
      50 * 1024 * 1024
    );

    console.log("✅ Bucket created:", res.$id);
  } catch {
    console.log("⚠️ Bucket may already exist");
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