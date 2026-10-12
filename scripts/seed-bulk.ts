import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { reservations, resources, users } from "../lib/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Fetching existing resources and users...");
  const resourceList = await db.select().from(resources);
  const userList = await db.select().from(users);

  if (resourceList.length === 0 || userList.length === 0) {
    throw new Error("Please run `npm run db:setup` first to seed initial resources and users.");
  }

  console.log(`Found ${resourceList.length} resources and ${userList.length} users.`);

  const TOTAL_RESERVATIONS = 5000;
  const BATCH_SIZE = 500;
  console.log(`Generating and inserting ${TOTAL_RESERVATIONS} non-overlapping reservations...`);

  // Start date in future to avoid conflicting with demo data
  const baseEpochMs = new Date("2035-01-01T08:00:00Z").getTime();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  let totalInserted = 0;
  let batchValues = [];

  for (let i = 0; i < TOTAL_RESERVATIONS; i++) {
    const resource = resourceList[i % resourceList.length];
    const user = userList[i % userList.length];

    // Distribute slots cleanly per resource so no overlaps occur:
    // Slot index for this specific resource
    const slotIndexForResource = Math.floor(i / resourceList.length);
    // 2 hours between bookings on the same resource
    const startMs = baseEpochMs + slotIndexForResource * 2 * ONE_HOUR_MS;
    const endMs = startMs + ONE_HOUR_MS;

    batchValues.push({
      resourceId: resource.id,
      userId: user.id,
      title: `Bulk Booking #${i + 1}`,
      notes: `Performance benchmark reservation ${i + 1}`,
      startAt: new Date(startMs),
      endAt: new Date(endMs),
      status: "CONFIRMED" as const,
    });

    if (batchValues.length >= BATCH_SIZE || i === TOTAL_RESERVATIONS - 1) {
      await db.insert(reservations).values(batchValues);
      totalInserted += batchValues.length;
      console.log(`Inserted ${totalInserted} / ${TOTAL_RESERVATIONS} reservations...`);
      batchValues = [];
    }
  }

  console.log("\nRunning EXPLAIN ANALYZE on index query plans...");

  const testResourceId = resourceList[0].id;
  const testUserId = userList[0].id;

  // 1. Query by resourceId and startAt range (matches reservations_resource_start_idx)
  console.log("\n--- EXPLAIN: Filter by resourceId and startAt range ---");
  const plan1 = await pool.query(`
    EXPLAIN ANALYZE
    SELECT * FROM reservations
    WHERE resource_id = $1 AND start_at > '2035-01-01' AND start_at < '2036-01-01'
    ORDER BY start_at DESC
    LIMIT 20
  `, [testResourceId]);
  console.log(plan1.rows.map((r) => r["QUERY PLAN"]).join("\n"));

  // 2. Query by userId (matches reservations_user_idx)
  console.log("\n--- EXPLAIN: Filter by userId ---");
  const plan2 = await pool.query(`
    EXPLAIN ANALYZE
    SELECT * FROM reservations
    WHERE user_id = $1
    ORDER BY start_at DESC
    LIMIT 20
  `, [testUserId]);
  console.log(plan2.rows.map((r) => r["QUERY PLAN"]).join("\n"));

  // 3. Query by status and startAt range (matches reservations_status_start_idx)
  console.log("\n--- EXPLAIN: Filter by status and startAt ---");
  const plan3 = await pool.query(`
    EXPLAIN ANALYZE
    SELECT * FROM reservations
    WHERE status = 'CONFIRMED' AND start_at > '2035-01-01'
    ORDER BY start_at DESC
    LIMIT 20
  `);
  console.log(plan3.rows.map((r) => r["QUERY PLAN"]).join("\n"));

  await pool.end();
  console.log("\nBulk seed and query plan verification complete.");
}

main().catch((err) => {
  console.error("Error during bulk seed:", err);
  process.exit(1);
});
