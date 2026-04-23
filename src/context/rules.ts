import fs from "node:fs/promises";
import path from "node:path";

export interface Rule {
  name: string;
  content: string;
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

async function loadRulesFromDir(dir: string, scope: Rule["scope"]): Promise<Rule[]> {
  const files = await readDirSafe(dir);
  const results: Rule[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const full = path.join(dir, file);
    try {
      const content = await fs.readFile(full, "utf8");
      results.push({
        name: file.replace(/\.md$/, ""),
        content: content.trim(),
        path: full,
        scope,
      });
    } catch {
      continue;
    }
  }
  return results;
}

export async function loadRules(opts: { globalDir: string; projectDir: string }): Promise<Rule[]> {
  const [globals, projects] = await Promise.all([
    loadRulesFromDir(opts.globalDir, "global"),
    loadRulesFromDir(opts.projectDir, "project"),
  ]);
  return mergeRules(globals, projects);
}

/** Pure merge: project overrides global on name conflicts. Global first, then project. */
export function mergeRules(globals: Rule[], projects: Rule[]): Rule[] {
  const projectNames = new Set(projects.map((r) => r.name));
  const filteredGlobals = globals.filter((r) => !projectNames.has(r.name));
  return [
    ...filteredGlobals.sort((a, b) => a.name.localeCompare(b.name)),
    ...projects.sort((a, b) => a.name.localeCompare(b.name)),
  ];
}
