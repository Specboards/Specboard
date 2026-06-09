import { DbStore } from "./db";
import { findRepoRoot, LocalFileStore } from "./local";
import type { FeatureStore } from "./types";

export type * from "./types";

let store: FeatureStore | undefined;

/**
 * Resolve the feature store once per process: Postgres when `DATABASE_URL`
 * is set, otherwise the zero-setup local file store.
 */
export async function getStore(): Promise<FeatureStore> {
  if (!store) {
    store = process.env.DATABASE_URL
      ? new DbStore(process.env.DATABASE_URL)
      : new LocalFileStore(await findRepoRoot());
  }
  return store;
}
