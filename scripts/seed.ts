import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resources, users } from "../lib/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  await db
    .insert(users)
    .values([
      { name: "Admin User", email: "admin@example.com", passwordHash: hash("Admin@123"), role: "ADMIN" },
      { name: "Member User", email: "member@example.com", passwordHash: hash("Member@123"), role: "MEMBER" },
    ])
    .onConflictDoNothing();

  await db
    .insert(resources)
    .values([
      { name: "Conference Room A", type: "Room", capacity: 12, location: "Floor 2" },
      { name: "Conference Room B", type: "Room", capacity: 6, location: "Floor 2" },
      { name: "Training Lab", type: "Lab", capacity: 20, location: "Floor 3" },
      { name: "Projector Kit", type: "Equipment", capacity: 1, location: "IT Store" },
      { name: "Company Van", type: "Vehicle", capacity: 8, location: "Basement Parking" },
    ])
    .onConflictDoNothing();

  await pool.end();
  console.log("Seeded demo users and resources.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
