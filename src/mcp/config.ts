import fs from "node:fs/promises";
import { mcpConfigSchema, type McpConfig } from "./schema.js";

async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function loadMcpConfig(opts: {
  globalPath: string;
  projectPath: string;
}): Promise<McpConfig> {
  const [globalRaw, projectRaw] = await Promise.all([
    readJsonIfExists(opts.globalPath),
    readJsonIfExists(opts.projectPath),
  ]);
  const global = globalRaw ? mcpConfigSchema.parse(globalRaw) : { servers: {} };
  const project = projectRaw ? mcpConfigSchema.parse(projectRaw) : { servers: {} };
  return mergeMcpConfigs(global, project);
}

/** Pure merge. Project server definitions override global ones with same name. */
export function mergeMcpConfigs(global: McpConfig, project: McpConfig): McpConfig {
  return {
    servers: { ...global.servers, ...project.servers },
  };
}
