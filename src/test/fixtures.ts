import type { StoredSession } from "../session/schema.js";

export const sessionFixture: StoredSession = {
  id: "00000000-0000-0000-0000-000000000001",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  cwd: "/tmp/fixture-cwd",
  model: "x/y",
  compactedAt: [],
  messages: [],
};
