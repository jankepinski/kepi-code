import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadMcpConfig, mergeMcpConfigs } from "./config.js";
import { mcpConfigSchema } from "./schema.js";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kepi-mcp-"));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("mcpConfigSchema", () => {
  it("parses empty config", () => {
    expect(mcpConfigSchema.parse({})).toEqual({ servers: {} });
  });

  it("parses server with defaults", () => {
    const r = mcpConfigSchema.parse({
      servers: { foo: { command: "npx" } },
    });
    expect(r.servers.foo).toEqual({ command: "npx", args: [] });
  });

  it("rejects missing command", () => {
    expect(() => mcpConfigSchema.parse({ servers: { foo: { args: [] } } })).toThrow();
  });

  it("accepts env var map", () => {
    const r = mcpConfigSchema.parse({
      servers: { foo: { command: "x", env: { KEY: "val" } } },
    });
    expect(r.servers.foo!.env).toEqual({ KEY: "val" });
  });
});

describe("mergeMcpConfigs", () => {
  it("project servers override global with same name", () => {
    const g = { servers: { s: { command: "global", args: [] } } };
    const p = { servers: { s: { command: "project", args: [] } } };
    const merged = mergeMcpConfigs(g, p);
    expect(merged.servers.s!.command).toBe("project");
  });

  it("combines non-overlapping servers", () => {
    const g = { servers: { a: { command: "x", args: [] } } };
    const p = { servers: { b: { command: "y", args: [] } } };
    const merged = mergeMcpConfigs(g, p);
    expect(Object.keys(merged.servers).sort()).toEqual(["a", "b"]);
  });
});

describe("loadMcpConfig", () => {
  it("returns empty when no files exist", async () => {
    const r = await loadMcpConfig({
      globalPath: path.join(root, "g.json"),
      projectPath: path.join(root, "p.json"),
    });
    expect(r).toEqual({ servers: {} });
  });

  it("loads and merges both files", async () => {
    const g = path.join(root, "g.json");
    const p = path.join(root, "p.json");
    await fs.writeFile(g, JSON.stringify({ servers: { a: { command: "x" } } }), "utf8");
    await fs.writeFile(p, JSON.stringify({ servers: { b: { command: "y" } } }), "utf8");
    const r = await loadMcpConfig({ globalPath: g, projectPath: p });
    expect(Object.keys(r.servers).sort()).toEqual(["a", "b"]);
  });
});
