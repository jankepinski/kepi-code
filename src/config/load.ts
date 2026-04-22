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

export async function loadConfig(cwd: string): Promise<Config> {
  const globalRaw = await readJsonIfExists(paths.globalConfig);
  if (!globalRaw) {
    throw new Error(
      `No global config found at ${paths.globalConfig}. Run 'kepi' once to set it up.`,
    );
  }

  const global = configSchema.parse(globalRaw);

  const projectRaw = await readJsonIfExists(paths.projectConfig(cwd));
  const project = projectRaw ? partialConfigSchema.parse(projectRaw) : null;

  return mergeConfigs(global, project);
}

export async function globalConfigExists(): Promise<boolean> {
  try {
    await fs.access(paths.globalConfig);
    return true;
  } catch {
    return false;
  }
}

export async function writeGlobalConfig(config: Config): Promise<void> {
  const dir = paths.globalConfig.substring(0, paths.globalConfig.lastIndexOf("/"));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(paths.globalConfig, JSON.stringify(config, null, 2), "utf8");
}
