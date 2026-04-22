import fs from "node:fs/promises";
import { configSchema, partialConfigSchema, type Config } from "./schema.js";
import { mergeConfigs } from "./merge.js";
import { paths } from "./paths.js";

async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${err.message}`);
    }
    throw err;
  }
}

export async function loadConfig(): Promise<Config | null> {
  const globalRaw = await readJsonIfExists(paths.globalConfig);
  if (!globalRaw) return null;

  const global = configSchema.parse(globalRaw);

  const projectRaw = await readJsonIfExists(paths.projectConfig);
  const project = projectRaw ? partialConfigSchema.parse(projectRaw) : null;

  return mergeConfigs(global, project);
}

export async function writeGlobalConfig(config: Config): Promise<void> {
  const dir = paths.globalConfig.substring(0, paths.globalConfig.lastIndexOf("/"));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(paths.globalConfig, JSON.stringify(config, null, 2), "utf8");
}
