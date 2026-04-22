import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadSkills, mergeSkills, type Skill } from "./skills.js";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kepi-skills-"));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

async function writeSkill(base: string, name: string, frontmatter: string, body = "content") {
  const dir = path.join(base, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), `${frontmatter}\n\n${body}`, "utf8");
}

describe("mergeSkills", () => {
  it("empty inputs produce empty output", () => {
    expect(mergeSkills([], [])).toEqual([]);
  });

  it("project overrides global on name conflict", () => {
    const g: Skill = {
      name: "x",
      description: "global",
      path: "/g",
      scope: "global",
    };
    const p: Skill = {
      name: "x",
      description: "project",
      path: "/p",
      scope: "project",
    };
    const merged = mergeSkills([g], [p]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.description).toBe("project");
    expect(merged[0]!.scope).toBe("project");
  });

  it("sorts alphabetically", () => {
    const a: Skill = { name: "zebra", description: "", path: "", scope: "global" };
    const b: Skill = { name: "apple", description: "", path: "", scope: "global" };
    const merged = mergeSkills([a, b], []);
    expect(merged.map((s) => s.name)).toEqual(["apple", "zebra"]);
  });
});

describe("loadSkills", () => {
  it("returns empty when dirs do not exist", async () => {
    const result = await loadSkills({
      globalDir: path.join(root, "no-global"),
      projectDir: path.join(root, "no-project"),
    });
    expect(result).toEqual([]);
  });

  it("loads valid skills and ignores invalid ones", async () => {
    const globalDir = path.join(root, "global");
    await writeSkill(
      globalDir,
      "valid",
      `---\nname: valid\ndescription: a valid skill\n---`,
    );
    await writeSkill(globalDir, "missing-desc", `---\nname: x\n---`);
    await writeSkill(globalDir, "no-frontmatter", `just body`);

    const result = await loadSkills({
      globalDir,
      projectDir: path.join(root, "no-project"),
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("valid");
    expect(result[0]!.scope).toBe("global");
  });

  it("project skills override global by name", async () => {
    const globalDir = path.join(root, "global");
    const projectDir = path.join(root, "project");
    await writeSkill(
      globalDir,
      "shared",
      `---\nname: shared\ndescription: from global\n---`,
    );
    await writeSkill(
      projectDir,
      "shared",
      `---\nname: shared\ndescription: from project\n---`,
    );

    const result = await loadSkills({ globalDir, projectDir });
    expect(result).toHaveLength(1);
    expect(result[0]!.description).toBe("from project");
    expect(result[0]!.scope).toBe("project");
  });
});
