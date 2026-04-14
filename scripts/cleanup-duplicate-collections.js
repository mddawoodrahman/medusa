require("dotenv").config({ path: ".env.local" });

const { Client, Databases } = require("node-appwrite");

const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE;
const APPLY_MODE = process.argv.includes("--apply");

if (!DATABASE_ID) {
  throw new Error("NEXT_PUBLIC_APPWRITE_DATABASE is required");
}

if (!APPWRITE_PROJECT_ID) {
  throw new Error("Appwrite project id is missing");
}

if (!process.env.NEXT_APPWRITE_KEY) {
  throw new Error("NEXT_APPWRITE_KEY is required");
}

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(process.env.NEXT_APPWRITE_KEY);

const databases = new Databases(client);

const TARGETS = [
  {
    name: "users",
    envKey: "NEXT_PUBLIC_APPWRITE_USERS_COLLECTION",
  },
  {
    name: "files",
    envKey: "NEXT_PUBLIC_APPWRITE_FILES_COLLECTION",
  },
  {
    name: "file_shares",
    envKey: "NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION",
  },
];

async function main() {
  console.log("\n🧹 Duplicate Appwrite Collection Cleanup\n");
  console.log("Mode:", APPLY_MODE ? "APPLY (deletes duplicates)" : "DRY RUN");

  const list = await databases.listCollections(DATABASE_ID);
  const collections = list.collections || [];
  let duplicatesFound = 0;

  for (const target of TARGETS) {
    const matches = collections.filter((collection) => collection.name === target.name);

    if (matches.length <= 1) {
      console.log(`✅ ${target.name}: no duplicates found`);
      continue;
    }

    duplicatesFound += 1;
    const preferredId = process.env[target.envKey];

    console.log(`\n⚠️ ${target.name}: found ${matches.length} collections`);
    console.log("Candidates:", matches.map((collection) => collection.$id).join(", "));

    if (!preferredId) {
      console.log(
        `⏭️ Skipped: ${target.envKey} is not set, so no safe keep-id could be determined.`,
      );
      continue;
    }

    const keep = matches.find((collection) => collection.$id === preferredId);

    if (!keep) {
      console.log(
        `⏭️ Skipped: env keep-id ${preferredId} was not found among duplicates.`,
      );
      continue;
    }

    const toDelete = matches.filter((collection) => collection.$id !== keep.$id);

    console.log(`Keeping: ${keep.$id}`);
    console.log(`Deleting: ${toDelete.map((collection) => collection.$id).join(", ")}`);

    if (!APPLY_MODE) {
      continue;
    }

    for (const candidate of toDelete) {
      await databases.deleteCollection(DATABASE_ID, candidate.$id);
      console.log(`🗑️ Deleted ${target.name} collection: ${candidate.$id}`);
    }
  }

  if (!APPLY_MODE) {
    console.log("\nDry run complete. Use --apply to delete listed duplicates.");
  }

  console.log("\nDone.");

  if (duplicatesFound > 0 && !APPLY_MODE) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("❌ Cleanup failed:", error.message);
  process.exit(1);
});
