import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

export interface Skill {
  name: string;
  description: string;
  path: string;
  scope: "global" | "project";
}

async function readDirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

async function loadSkillFromDir(skillDir: string, scope: Skill["scope"]): Promise<Skill | null> {
  const skillFile = path.join(skillDir, "SKILL.md");
  try {
    const raw = await fs.readFile(skillFile, "utf8");
    const { data } = parseFrontmatter(raw);
    if (!data.name || !data.description) return null;
    return {
      name: data.name,
      description: data.description,
      path: skillFile,
      scope,
    };
  } catch {
    return null;
  }
}

async function loadSkillsFromRoot(root: string, scope: Skill["scope"]): Promise<Skill[]> {
  const entries = await readDirSafe(root);
  const results: Skill[] = [];
  for (const entry of entries) {
    const full = path.join(root, entry);
    try {
      const stat = await fs.stat(full);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }
    const skill = await loadSkillFromDir(full, scope);
    if (skill) results.push(skill);
  }
  return results;
}

/**
 * Load all skills from both global and project locations. Project skills
 * override global ones with the same `name`.
 */
export async function loadSkills(opts: {
  globalDir: string;
  projectDir: string;
}): Promise<Skill[]> {
  const [globals, projects] = await Promise.all([
    loadSkillsFromRoot(opts.globalDir, "global"),
    loadSkillsFromRoot(opts.projectDir, "project"),
  ]);
  return mergeSkills(globals, projects);
}

/** Pure merge: project wins on name conflicts. Stable alphabetical order. */
export function mergeSkills(globals: Skill[], projects: Skill[]): Skill[] {
  const byName = new Map<string, Skill>();
  for (const s of globals) byName.set(s.name, s);
  for (const s of projects) byName.set(s.name, s);
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}
