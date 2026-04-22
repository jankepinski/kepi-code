import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadRules, mergeRules, type Rule } from "./rules.js";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kepi-rules-"));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("mergeRules", () => {
  it("project overrides global on name match", () => {
    const g: Rule = { name: "style", content: "global", path: "/g", scope: "global" };
    const p: Rule = { name: "style", content: "project", path: "/p", scope: "project" };
    const result = mergeRules([g], [p]);
    expect(result).toHaveLength(1);
    expect(result[0]!.content).toBe("project");
  });

  it("keeps non-conflicting globals and projects", () => {
    const result = mergeRules(
      [{ name: "a", content: "", path: "", scope: "global" }],
      [{ name: "b", content: "", path: "", scope: "project" }],
    );
    expect(result.map((r) => r.name)).toEqual(["a", "b"]);
  });
});

describe("loadRules", () => {
  it("returns empty when both dirs missing", async () => {
    const result = await loadRules({
      globalDir: path.join(root, "no-g"),
      projectDir: path.join(root, "no-p"),
    });
    expect(result).toEqual([]);
  });

  it("loads .md files and ignores non-md", async () => {
    const globalDir = path.join(root, "global");
    await fs.mkdir(globalDir, { recursive: true });
    await fs.writeFile(path.join(globalDir, "a.md"), "rule A", "utf8");
    await fs.writeFile(path.join(globalDir, "b.txt"), "not a rule", "utf8");

    const result = await loadRules({
      globalDir,
      projectDir: path.join(root, "no-p"),
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("a");
    expect(result[0]!.content).toBe("rule A");
  });

  it("merges global and project rules with project override", async () => {
    const globalDir = path.join(root, "global");
    const projectDir = path.join(root, "project");
    await fs.mkdir(globalDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(globalDir, "style.md"), "global style", "utf8");
    await fs.writeFile(path.join(globalDir, "tests.md"), "global tests", "utf8");
    await fs.writeFile(path.join(projectDir, "style.md"), "project style", "utf8");

    const result = await loadRules({ globalDir, projectDir });
    expect(result).toHaveLength(2);
    const style = result.find((r) => r.name === "style")!;
    expect(style.content).toBe("project style");
    expect(style.scope).toBe("project");
    const tests = result.find((r) => r.name === "tests")!;
    expect(tests.content).toBe("global tests");
  });
});
