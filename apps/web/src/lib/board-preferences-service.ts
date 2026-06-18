import {
  getStore,
  type BoardPreferences,
  type WorkspaceScope,
} from "@/lib/store";

/**
 * Domain operations for board preferences behind /api/v1/board-preferences.
 * Mirrors views-service: thin routes, validation + store access here.
 */

export class InvalidBoardPreferencesError extends Error {}

const MAX_FIELDS = 32;
const MAX_KEY_LEN = 80;

/** Parse and validate an untrusted board-preferences body. */
export function parseBoardPreferences(body: unknown): BoardPreferences {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvalidBoardPreferencesError("Request body must be a JSON object.");
  }
  const raw = body as Record<string, unknown>;

  let cardFields: string[] | null = null;
  if (raw.cardFields !== undefined && raw.cardFields !== null) {
    if (
      !Array.isArray(raw.cardFields) ||
      raw.cardFields.some(
        (k) => typeof k !== "string" || k === "" || k.length > MAX_KEY_LEN,
      )
    ) {
      throw new InvalidBoardPreferencesError(
        "cardFields must be an array of non-empty field-key strings.",
      );
    }
    if (raw.cardFields.length > MAX_FIELDS) {
      throw new InvalidBoardPreferencesError(
        `cardFields must have at most ${MAX_FIELDS} entries.`,
      );
    }
    // De-dupe while preserving order.
    cardFields = [...new Set(raw.cardFields as string[])];
  }

  let featured: string | null = null;
  if (raw.featured !== undefined && raw.featured !== null) {
    if (typeof raw.featured !== "string" || raw.featured.length > MAX_KEY_LEN) {
      throw new InvalidBoardPreferencesError(
        "featured must be a field-key string or null.",
      );
    }
    featured = raw.featured;
  }

  return { cardFields, featured };
}

export async function getBoardPreferences(
  scope?: WorkspaceScope,
): Promise<BoardPreferences | null> {
  const store = await getStore();
  return store.getBoardPreferences(scope);
}

export async function setBoardPreferences(
  prefs: BoardPreferences,
  scope?: WorkspaceScope,
): Promise<void> {
  const store = await getStore();
  await store.setBoardPreferences(prefs, scope);
}
