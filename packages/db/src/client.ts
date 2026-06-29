import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDb>;

/**
 * Create a Drizzle client from a Postgres connection string (self-host
 * compose stack or hosted Postgres). Tenant isolation is enforced by RLS at
 * the database layer, so callers must connect with an appropriately scoped role.
 */
export function createDb(connectionString: string) {
  const sql = postgres(connectionString, { prepare: false });
  return drizzle(sql, { schema });
}

export { schema };
