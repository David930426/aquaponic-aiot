// Set or update the TTL index on SensorReading.recordedAt.
//
// Run manually:
//   node scripts/setup-ttl.mjs 30        # retain 30 days
//   node scripts/setup-ttl.mjs 7         # retain 7 days
//
// Default retention is 30 days. Re-run after changing `sensorRetentionDays`
// in /settings/data-source if you want the TTL to immediately match.

import { MongoClient } from "mongodb";
import { config } from "dotenv";

config();

const DAYS = Number(process.argv[2] ?? "30");
const SECONDS = DAYS * 24 * 60 * 60;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Did you run with `node -r dotenv/config`?");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const dbName = url.pathname.replace(/^\//, "") || "aquawatch";

const client = new MongoClient(process.env.DATABASE_URL);
await client.connect();
const db = client.db(dbName);
const col = db.collection("SensorReading");

// MongoDB only allows one TTL config per index. If the existing TTL index has
// a different expireAfterSeconds, drop and recreate. Otherwise leave it.
const existing = await col.indexes();
const ttlIdx = existing.find(
  (i) => i.expireAfterSeconds !== undefined && i.key?.recordedAt === 1,
);

if (ttlIdx && ttlIdx.expireAfterSeconds === SECONDS) {
  console.log(`✓ TTL index already set to ${DAYS} days (${SECONDS}s)`);
} else {
  if (ttlIdx) {
    await col.dropIndex(ttlIdx.name);
    console.log(`• dropped old TTL index (${ttlIdx.expireAfterSeconds}s)`);
  }
  await col.createIndex(
    { recordedAt: 1 },
    { expireAfterSeconds: SECONDS, name: "SensorReading_recordedAt_ttl" },
  );
  console.log(`✓ TTL index created on SensorReading.recordedAt — ${DAYS} days`);
}

await client.close();
