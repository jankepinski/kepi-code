import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { StoredSession } from "../session/schema.js";
import { sessionFixture } from "./fixtures.js";

/**
 * Write a session JSON file directly to disk, bypassing SessionStore.createDraft.
 * Defaults come from `sessionFixture`; pass overrides for fields the test cares
 * about. Each call gets a fresh `id` and `createdAt`/`updatedAt` of "now"
 * unless overridden.
 */
export async function writeSessionFile(
  dir: string,
  overrides: Partial<StoredSession> = {},
): Promise<string> {
  const now = new Date().toISOString();
  const session: StoredSession = {
    ...sessionFixture,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await fs.writeFile(path.join(dir, `${session.id}.json`), JSON.stringify(session), "utf8");
  return session.id;
}
