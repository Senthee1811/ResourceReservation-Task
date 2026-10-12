// Load .env for DATABASE_URL when running tests locally.
import { existsSync, readFileSync } from "node:fs";

if (!process.env.DATABASE_URL && existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Ensure the worker points to the isolated test database
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (!url.pathname.includes("reservation_test")) {
      url.pathname = "/reservation_test";
      process.env.DATABASE_URL = url.toString();
    }
  } catch {
    // Leave unchanged if not URL
  }
}
