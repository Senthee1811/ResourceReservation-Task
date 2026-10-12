import { existsSync, readFileSync } from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export async function setup() {
  if (!process.env.DATABASE_URL && existsSync(".env")) {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }

  const baseDbUrl =
    process.env.DATABASE_URL ||
    "postgresql://reservation:reservation@localhost:5433/reservation?schema=public";

  const parsed = new URL(baseDbUrl);

  // Connect to default database and create reservation_test if missing
  const adminPool = new Pool({ connectionString: baseDbUrl });
  try {
    const res = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'reservation_test'",
    );
    if (res.rowCount === 0) {
      await adminPool.query("CREATE DATABASE reservation_test");
    }
  } finally {
    await adminPool.end();
  }

  // Point to test database
  parsed.pathname = "/reservation_test";
  const testDbUrl = parsed.toString();
  process.env.DATABASE_URL = testDbUrl;

  // Apply migrations to test database
  const testPool = new Pool({ connectionString: testDbUrl });
  try {
    const db = drizzle(testPool);
    await migrate(db, { migrationsFolder: "./drizzle" });
  } finally {
    await testPool.end();
  }
}
