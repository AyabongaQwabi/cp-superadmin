import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL;
const dbName = process.env.SELECTED_DB;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

function getClientPromise() {
  if (!uri) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect().catch((error) => {
        global._mongoClientPromise = undefined;
        throw error;
      });
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb() {
  if (!dbName) {
    throw new Error("SELECTED_DB is not set. Add it to .env.local.");
  }
  const client = await getClientPromise();
  return client.db(dbName);
}

// Derived operational read-model database. This remains separate from the
// production DB and is used only for analytics surfaces that need synced data.
const companionDbName = process.env.COMPANION_DB || "cp_companion";
const adminCompanionDbName = process.env.ADMIN_COMPANION_DB || "clinicplus_admin_companion";

export async function getCompanionDb() {
  const client = await getClientPromise();
  return client.db(companionDbName);
}

export async function getAdminCompanionDb() {
  const client = await getClientPromise();
  return client.db(adminCompanionDbName);
}

export default getClientPromise;
