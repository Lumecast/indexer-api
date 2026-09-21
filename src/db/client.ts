import pg from "pg";
import { loadConfig } from "../config.js";

let pool: pg.Pool | undefined;

export function createPool(databaseUrl: string): pg.Pool {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set — provide a Postgres connection string");
  }
  return new pg.Pool({ connectionString: databaseUrl });
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = createPool(loadConfig().databaseUrl);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}