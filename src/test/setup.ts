import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Pin `process.cwd()` to a stable temp directory for the whole test run.
 * Must happen before any module that captures `process.cwd()` at import
 * time (notably `src/config/paths.ts`) is loaded. Vitest runs setupFiles
 * before the test file itself, so this is safe as long as this file does
 * not import production modules.
 */
export const TEST_CWD = path.join(os.tmpdir(), "kepi-test-cwd");
fs.mkdirSync(TEST_CWD, { recursive: true });
process.chdir(TEST_CWD);
