import os from "node:os";
import path from "node:path";

export const CWD = process.cwd();
export const GLOBAL_DIR = path.join(os.homedir(), ".kepi");
export const PROJECT_DIR_NAME = ".kepi";

const PROJECT_DIR = path.join(CWD, PROJECT_DIR_NAME);

export const paths = {
  globalConfig: path.join(GLOBAL_DIR, "config.json"),
  globalMcp: path.join(GLOBAL_DIR, "mcp.json"),
  globalSkills: path.join(GLOBAL_DIR, "skills"),
  globalRules: path.join(GLOBAL_DIR, "rules"),
  sessions: path.join(GLOBAL_DIR, "sessions"),
  projectConfig: path.join(PROJECT_DIR, "config.json"),
  projectMcp: path.join(PROJECT_DIR, "mcp.json"),
  projectSkills: path.join(PROJECT_DIR, "skills"),
  projectRules: path.join(PROJECT_DIR, "rules"),
};
