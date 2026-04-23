import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { CoreMessage } from "ai";
import { sessionSchema, type StoredSession } from "./schema.js";
import { CWD, paths } from "../config/paths.js";

export interface SessionStoreOptions {
  dir: string;
}

export interface NewSessionInput {
  model: string;
  title?: string;
}

export class SessionStore {
  constructor(private readonly opts: SessionStoreOptions) {}

  private filePath(id: string): string {
    return path.join(this.opts.dir, `${id}.json`);
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.opts.dir, { recursive: true });
  }

  createDraft(input: NewSessionInput): StoredSession {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      cwd: CWD,
      model: input.model,
      ...(input.title !== undefined ? { title: input.title } : {}),
      compactedAt: [],
      messages: [],
    };
  }

  async save(session: StoredSession, messages: CoreMessage[]): Promise<void> {
    await this.ensureDir();
    const toStore: StoredSession = {
      ...session,
      updatedAt: new Date().toISOString(),
      messages: messages as unknown as StoredSession["messages"],
    };
    const target = this.filePath(toStore.id);
    const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(toStore, null, 2), "utf8");
    await fs.rename(tmp, target);
  }

  async load(id: string): Promise<StoredSession | null> {
    try {
      const raw = await fs.readFile(this.filePath(id), "utf8");
      const parsed = JSON.parse(raw);
      return sessionSchema.parse(parsed);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async list(): Promise<
    Array<Pick<StoredSession, "id" | "createdAt" | "updatedAt" | "cwd" | "model" | "title">>
  > {
    try {
      await this.ensureDir();
      const files = await fs.readdir(this.opts.dir);
      const entries: StoredSession[] = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await fs.readFile(path.join(this.opts.dir, file), "utf8");
          const parsed = sessionSchema.parse(JSON.parse(raw));
          entries.push(parsed);
        } catch {
          // skip corrupted files rather than crash the whole listing
          continue;
        }
      }
      entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return entries.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        cwd: e.cwd,
        model: e.model,
        ...(e.title !== undefined ? { title: e.title } : {}),
      }));
    } catch {
      return [];
    }
  }

  async findLastForCwd(): Promise<StoredSession | null> {
    const all = await this.list();
    const match = all.find((s) => s.cwd === CWD);
    if (!match) return null;
    return this.load(match.id);
  }
}

export const sessionStore = new SessionStore({ dir: paths.sessions });
