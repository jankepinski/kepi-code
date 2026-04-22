import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { paths } from "../config/paths.js";

/**
 * Copy built-in meta-skills (install-skill, install-rule) into ~/.kepi/skills
 * on first run. Non-destructive: skips skills that already exist so users can
 * customise them.
 */
export async function installBuiltinSkills(): Promise<string[]> {
  const srcDir = resolveBuiltinSkillsDir();
  const installed: string[] = [];

  let entries: string[];
  try {
    entries = await fs.readdir(srcDir);
  } catch {
    return installed;
  }

  await fs.mkdir(paths.globalSkills, { recursive: true });

  for (const entry of entries) {
    const src = path.join(srcDir, entry);
    const dst = path.join(paths.globalSkills, entry);
    try {
      const stat = await fs.stat(src);
      if (!stat.isDirectory()) continue;
      const dstExists = await exists(dst);
      if (dstExists) continue;
      await copyDir(src, dst);
      installed.push(entry);
    } catch {
      continue;
    }
  }

  return installed;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else {
      await fs.copyFile(s, d);
    }
  }
}

/**
 * Locate the built-in skills directory. In development (tsx) we read from
 * src/builtin-skills; in a published build we read from the packaged copy.
 */
function resolveBuiltinSkillsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Try layouts used by tsx dev, the tsup bundle, and the published package.
  const candidates = [
    // src/bootstrap/install.ts in dev → sibling of bootstrap/
    path.join(here, "..", "builtin-skills"),
    // dist/cli.js bundled → src/builtin-skills shipped alongside dist
    path.join(here, "..", "src", "builtin-skills"),
    path.join(here, "..", "..", "src", "builtin-skills"),
  ];
  for (const c of candidates) {
    try {
      fsSync.statSync(c);
      return c;
    } catch {
      continue;
    }
  }
  return candidates[0]!;
}
