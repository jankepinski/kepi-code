import os from "node:os";
import path from "node:path";

export const GLOBAL_DIR = path.join(os.homedir(), ".kepi");
export const PROJECT_DIR_NAME = ".kepi";

export function projectDir(cwd: string): string {
  return path.join(cwd, PROJECT_DIR_NAME);
}

export const paths = {
  globalConfig: path.join(GLOBAL_DIR, "config.json"),
  globalMcp: path.join(GLOBAL_DIR, "mcp.json"),
  globalSkills: path.join(GLOBAL_DIR, "skills"),
  globalRules: path.join(GLOBAL_DIR, "rules"),
  sessions: path.join(GLOBAL_DIR, "sessions"),
  projectConfig: (cwd: string) => path.join(projectDir(cwd), "config.json"),
  projectMcp: (cwd: string) => path.join(projectDir(cwd), "mcp.json"),
  projectSkills: (cwd: string) => path.join(projectDir(cwd), "skills"),
  projectRules: (cwd: string) => path.join(projectDir(cwd), "rules"),
};
