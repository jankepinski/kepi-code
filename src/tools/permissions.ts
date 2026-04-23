import type { Config } from "../config/schema.js";

export type Decision =
  | { kind: "auto-approve"; reason: string }
  | { kind: "deny"; reason: string }
  | { kind: "confirm"; reason: string };

/**
 * Heuristics for "destructive" commands that must always require confirmation
 * even if the prefix is on the autoApprove list. Matched per-segment after
 * splitting a pipeline.
 */
const DESTRUCTIVE_PATTERNS: RegExp[] = [
  /^\s*rm(\s|$)/,
  /^\s*sudo(\s|$)/,
  /^\s*chmod(\s|$)/,
  /^\s*chown(\s|$)/,
  /^\s*dd(\s|$)/,
  /^\s*mkfs(\s|$)/,
  /^\s*shutdown(\s|$)/,
  /^\s*reboot(\s|$)/,
  /^\s*mv\s+(?!\/tmp\/|\.\/tmp\/)/,
  /\bgit\s+push\s+.*--force\b/,
  /\bgit\s+push\s+.*-f\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\s+-[a-z]*f/,
  /\bcurl\s[^|]*\|\s*(sh|bash|zsh)\b/,
  /\bwget\s[^|]*\|\s*(sh|bash|zsh)\b/,
  />\s*\/(?!tmp\/|dev\/null)/,
  />>\s*\/(?!tmp\/|dev\/null)/,
];

/**
 * Split a shell command into segments on top-level separators (|, &&, ||, ;).
 * Respects single/double quotes to avoid breaking inside strings.
 * Note: does NOT support heredocs or backticks — good enough for classification.
 */
export function splitPipeline(command: string): string[] {
  const segments: string[] = [];
  let current = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;

  while (i < command.length) {
    const ch = command[i]!;
    const next = command[i + 1];

    if (ch === "\\" && i + 1 < command.length) {
      current += ch + command[i + 1];
      i += 2;
      continue;
    }

    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      current += ch;
      i += 1;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      current += ch;
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble) {
      if ((ch === "&" && next === "&") || (ch === "|" && next === "|")) {
        segments.push(current.trim());
        current = "";
        i += 2;
        continue;
      }
      if (ch === "|" || ch === ";") {
        segments.push(current.trim());
        current = "";
        i += 1;
        continue;
      }
    }

    current += ch;
    i += 1;
  }

  const trimmed = current.trim();
  if (trimmed) segments.push(trimmed);
  return segments.filter((s) => s.length > 0);
}

function matchesPrefix(command: string, prefix: string): boolean {
  const normalized = command.trim().replace(/\s+/g, " ");
  const normPrefix = prefix.trim().replace(/\s+/g, " ");
  if (normalized === normPrefix) return true;
  return normalized.startsWith(normPrefix + " ");
}

function matchesAny(command: string, patterns: string[]): boolean {
  return patterns.some((p) => matchesPrefix(command, p));
}

function isDestructive(segment: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((re) => re.test(segment));
}

/**
 * Classify a shell command into auto-approve / deny / confirm. Pure function,
 * no side effects. Input: full command string (may contain pipelines) and the
 * permissions config. Output: a single decision for the whole pipeline.
 *
 * Rules:
 *   1. If ANY segment matches alwaysDeny → deny.
 *   2. If ANY segment is destructive → confirm (never auto-approve).
 *   3. If ALL segments match autoApprove → auto-approve.
 *   4. Otherwise → confirm.
 */
export function classifyCommand(command: string, permissions: Config["permissions"]): Decision {
  const trimmed = command.trim();
  if (!trimmed) {
    return { kind: "deny", reason: "Empty command" };
  }

  const segments = splitPipeline(trimmed);
  if (segments.length === 0) {
    return { kind: "deny", reason: "Empty command" };
  }

  if (matchesAny(trimmed, permissions.alwaysDeny)) {
    return { kind: "deny", reason: `Blocked by alwaysDeny: "${trimmed}"` };
  }

  for (const segment of segments) {
    if (matchesAny(segment, permissions.alwaysDeny)) {
      return { kind: "deny", reason: `Segment blocked by alwaysDeny: "${segment}"` };
    }
  }

  for (const segment of segments) {
    if (isDestructive(segment)) {
      return {
        kind: "confirm",
        reason: `Destructive pattern detected in: "${segment}"`,
      };
    }
  }

  const allAuto = segments.every((s) => matchesAny(s, permissions.autoApprove));
  if (allAuto) {
    return { kind: "auto-approve", reason: "All segments match autoApprove list" };
  }

  return { kind: "confirm", reason: "Not on autoApprove list" };
}
