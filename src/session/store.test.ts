import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SessionStore } from "./store.js";
import type { CoreMessage } from "ai";

let tmpDir: string;
let store: SessionStore;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kepi-sessions-"));
  store = new SessionStore({ dir: tmpDir });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("SessionStore", () => {
  it("createDraft returns a session with unique id", () => {
    const a = store.createDraft({ cwd: "/tmp", model: "x/y" });
    const b = store.createDraft({ cwd: "/tmp", model: "x/y" });
    expect(a.id).not.toBe(b.id);
    expect(a.messages).toEqual([]);
  });

  it("save and load round-trips messages", async () => {
    const draft = store.createDraft({ cwd: "/tmp", model: "x/y" });
    const messages: CoreMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ];
    await store.save(draft, messages);
    const loaded = await store.load(draft.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.messages).toHaveLength(2);
    expect(loaded!.id).toBe(draft.id);
  });

  it("load returns null for missing session", async () => {
    const result = await store.load("00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("list returns sessions sorted by updatedAt desc", async () => {
    const a = store.createDraft({ cwd: "/tmp/a", model: "x/y" });
    await store.save(a, []);
    await new Promise((r) => setTimeout(r, 10));
    const b = store.createDraft({ cwd: "/tmp/b", model: "x/y" });
    await store.save(b, []);

    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe(b.id);
    expect(list[1]!.id).toBe(a.id);
  });

  it("list skips corrupted JSON files", async () => {
    const good = store.createDraft({ cwd: "/tmp", model: "x/y" });
    await store.save(good, []);
    await fs.writeFile(path.join(tmpDir, "bad.json"), "{not json", "utf8");

    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(good.id);
  });

  it("save uses atomic rename (no tmp file left behind)", async () => {
    const draft = store.createDraft({ cwd: "/tmp", model: "x/y" });
    await store.save(draft, []);
    const files = await fs.readdir(tmpDir);
    const tmpFiles = files.filter((f) => f.includes(".tmp-"));
    expect(tmpFiles).toHaveLength(0);
  });

  it("findLastForCwd returns most recent session for given cwd", async () => {
    const a = store.createDraft({ cwd: "/tmp/a", model: "x/y" });
    await store.save(a, []);
    await new Promise((r) => setTimeout(r, 10));
    const b = store.createDraft({ cwd: "/tmp/a", model: "x/y" });
    await store.save(b, []);
    await new Promise((r) => setTimeout(r, 10));
    const other = store.createDraft({ cwd: "/tmp/other", model: "x/y" });
    await store.save(other, []);

    const found = await store.findLastForCwd("/tmp/a");
    expect(found?.id).toBe(b.id);
  });

  it("findLastForCwd returns null when no match", async () => {
    const result = await store.findLastForCwd("/nonexistent");
    expect(result).toBeNull();
  });

  it("list returns [] for missing directory", async () => {
    await fs.rm(tmpDir, { recursive: true });
    const list = await store.list();
    expect(list).toEqual([]);
  });

  it("save updates updatedAt on each save", async () => {
    const draft = store.createDraft({ cwd: "/tmp", model: "x/y" });
    await store.save(draft, []);
    const first = await store.load(draft.id);
    await new Promise((r) => setTimeout(r, 10));
    await store.save(draft, [{ role: "user", content: "hi" }]);
    const second = await store.load(draft.id);
    expect(second!.updatedAt > first!.updatedAt).toBe(true);
  });
});
