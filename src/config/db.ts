import { Pool } from "pg";
import { env } from "./env.js";

let db: Pool | null = null;

export function initializeDb(): void {
  if (!env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Database-backed routes will be unavailable.");
    return;
  }

  db = new Pool({ connectionString: env.DATABASE_URL });

  db.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
  });
}

export function getDb(): Pool | null {
  return db;
}

export async function closeDb(): Promise<void> {
  if (!db) return;

  const pool = db;
  db = null;
  await pool.end();
}
