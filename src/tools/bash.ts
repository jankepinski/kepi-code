import { execa } from "execa";
import { tool } from "ai";
import { z } from "zod";
import { classifyCommand, type Decision } from "./permissions.js";
import { formatBashResult, type RawBashResult } from "./bash-format.js";
import type { Config } from "../config/schema.js";
import { CWD } from "../config/paths.js";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 30_000;

export type ApprovalResult =
  | { kind: "approve" }
  | { kind: "approve-always"; pattern: string }
  | { kind: "deny" };

export interface PermissionRequester {
  /**
   * Called when a command needs user confirmation. The UI prompts the user and
   * returns their decision. Pure-ish: may read stdin, must not mutate config.
   */
  requestApproval: (command: string, decision: Decision) => Promise<ApprovalResult>;
}

export interface BashToolDeps {
  config: Config;
  requester: PermissionRequester;
  /**
   * Optional callback invoked when the user selects "always allow". Used by
   * the app to persist the new pattern into the config file. Kept as a
   * dependency so the tool itself remains testable.
   */
  onAlwaysAllow?: (pattern: string) => void | Promise<void>;
  /**
   * Override for tests. Defaults to execa.
   */
  exec?: typeof execa;
}

async function runBash(
  command: string,
  timeoutMs: number,
  exec: typeof execa,
): Promise<RawBashResult> {
  const start = Date.now();
  try {
    const result = await exec("bash", ["-c", command], {
      cwd: CWD,
      timeout: timeoutMs,
      reject: false,
      all: false,
      stripFinalNewline: false,
    });
    return {
      stdout: result.stdout?.toString() ?? "",
      stderr: result.stderr?.toString() ?? "",
      exitCode: typeof result.exitCode === "number" ? result.exitCode : -1,
      timedOut: Boolean(result.timedOut),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; exitCode?: number; timedOut?: boolean };
    return {
      stdout: e.stdout?.toString() ?? "",
      stderr: e.stderr?.toString() ?? String(err),
      exitCode: typeof e.exitCode === "number" ? e.exitCode : -1,
      timedOut: Boolean(e.timedOut),
      durationMs: Date.now() - start,
    };
  }
}

export function createBashTool(deps: BashToolDeps) {
  const exec = deps.exec ?? execa;

  return tool({
    description:
      "Execute a shell command via bash -c. Use this for everything: reading files (cat, rg), " +
      "searching (rg, find), editing (sed, heredocs), git, tests, and any other CLI work. " +
      "Output is truncated if very long. Destructive commands require user confirmation.",
    parameters: z.object({
      command: z.string().min(1).describe("The shell command to execute via bash -c"),
      timeout_ms: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(`Timeout in milliseconds. Default ${DEFAULT_TIMEOUT_MS}.`),
    }),
    execute: async ({ command, timeout_ms }) => {
      const decision = classifyCommand(command, deps.config.permissions);

      if (decision.kind === "deny") {
        return `[DENIED] ${decision.reason}`;
      }

      if (decision.kind === "confirm") {
        const approval = await deps.requester.requestApproval(command, decision);
        if (approval.kind === "deny") {
          return `[DENIED by user] ${decision.reason}`;
        }
        if (approval.kind === "approve-always" && deps.onAlwaysAllow) {
          await deps.onAlwaysAllow(approval.pattern);
        }
      }

      const raw = await runBash(command, timeout_ms ?? DEFAULT_TIMEOUT_MS, exec);
      return formatBashResult(raw, { maxBytes: DEFAULT_MAX_OUTPUT_BYTES });
    },
  });
}
