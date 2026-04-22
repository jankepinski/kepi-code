export interface RawBashResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}

export interface FormatOptions {
  maxBytes: number;
}

/**
 * Truncate long output to avoid blowing the model's context window. Keeps head
 * and tail, inserts a separator in the middle. Pure function.
 */
export function truncate(text: string, maxBytes: number): string {
  if (text.length <= maxBytes) return text;
  const SEPARATOR_RESERVE = 60;
  const available = Math.max(40, maxBytes - SEPARATOR_RESERVE);
  const head = Math.max(20, Math.floor(available * 0.6));
  const tail = Math.max(20, available - head);
  const omitted = text.length - head - tail;
  return (
    text.slice(0, head) +
    `\n\n[... ${omitted} bytes truncated ...]\n\n` +
    text.slice(text.length - tail)
  );
}

/**
 * Format a raw bash result into a single string the LLM will see as the tool
 * result. Includes exit code, timing, and any stderr as a labelled section.
 */
export function formatBashResult(result: RawBashResult, opts: FormatOptions): string {
  const parts: string[] = [];
  if (result.timedOut) {
    parts.push(`[TIMEOUT after ${result.durationMs}ms]`);
  }
  parts.push(`exit code: ${result.exitCode}`);
  parts.push(`duration: ${result.durationMs}ms`);

  const stdout = truncate(result.stdout, opts.maxBytes);
  const stderr = truncate(result.stderr, opts.maxBytes);

  if (stdout.trim()) {
    parts.push(`--- stdout ---\n${stdout}`);
  }
  if (stderr.trim()) {
    parts.push(`--- stderr ---\n${stderr}`);
  }
  if (!stdout.trim() && !stderr.trim()) {
    parts.push("(no output)");
  }

  return parts.join("\n");
}
