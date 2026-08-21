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

// The cp-companion service owns a separate database (`cp_companion`) on the
// same Atlas cluster as DATABASE_URL/SELECTED_DB — same connection/cluster,
// different database name. COMPANION_DB matches the env var convention used
// by cp-companion itself (defaulting to "cp_companion" there too), so both
// services agree on the database name without hardcoding it in either repo.
const companionDbName = process.env.COMPANION_DB || "cp_companion";

export async function getCompanionDb() {
  const client = await getClientPromise();
  return client.db(companionDbName);
}

export default getClientPromise;
