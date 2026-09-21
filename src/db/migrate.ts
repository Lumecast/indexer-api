import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { closePool, getPool } from "./client.js";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url));

const SCHEMA_MIGRATIONS = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    checksum    TEXT NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function listUpFiles(): Promise<string[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  return entries
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
    .sort();
}

async function verifyApplied(client: pg.PoolClient, applied: Map<string, string>): Promise<void> {
  for (const [name, checksum] of applied) {
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, name), "utf8");
    const current = sha256(sql);
    if (current !== checksum) {
      throw new Error(`migration ${name} has been modified after being applied (checksum mismatch)`);
    }
  }
}

async function migrateUp(client: pg.PoolClient): Promise<void> {
  await client.query(SCHEMA_MIGRATIONS);
  const res = await client.query<{ name: string; checksum: string }>(
    "SELECT name, checksum FROM schema_migrations",
  );
  const applied = new Map(res.rows.map((r) => [r.name, r.checksum]));
  await verifyApplied(client, applied);

  for (const file of await listUpFiles()) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    const checksum = sha256(sql);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [file, checksum]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    console.log(`applied ${file}`);
  }
}

async function migrateDown(client: pg.PoolClient): Promise<void> {
  await client.query(SCHEMA_MIGRATIONS);
  const res = await client.query<{ name: string }>(
    "SELECT name FROM schema_migrations ORDER BY id DESC LIMIT 1",
  );
  const last = res.rows[0]?.name;
  if (!last) {
    console.log("nothing to revert");
    return;
  }

  const downPath = path.join(MIGRATIONS_DIR, last.replace(/\.sql$/, ".down.sql"));
  const downSql = await fs.readFile(downPath, "utf8");

  await client.query("BEGIN");
  try {
    await client.query(downSql);
    await client.query("DELETE FROM schema_migrations WHERE name = $1", [last]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
  console.log(`reverted ${last} (${path.basename(downPath)})`);
}

async function main(): Promise<void> {
  const revert = process.argv.includes("--revert");
  const client = await getPool().connect();
  try {
    if (revert) {
      await migrateDown(client);
    } else {
      await migrateUp(client);
    }
  } finally {
    client.release();
    await closePool();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});