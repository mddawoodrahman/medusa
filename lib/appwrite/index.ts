"use server";

import { Avatars, Client, Databases, Storage } from "node-appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Users } from "node-appwrite";

export const createAdminClient = async () => {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.secretKey);

  return {
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
    get avatars() {
      return new Avatars(client);
    },
    get users() {
      return new Users(client);
    },
  };
};
