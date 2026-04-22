import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

const width = Math.min(100, (process.stdout.columns ?? 80) - 2);

// markedTerminal returns an extension object compatible with marked.use().
// Types between marked and marked-terminal can drift; cast at the boundary.
marked.use(
  markedTerminal({
    reflowText: false,
    tab: 2,
    width,
  }) as Parameters<typeof marked.use>[0],
);

/**
 * Render markdown for terminal output. Used by the Ink history to colourise
 * assistant responses.
 */
export function renderMarkdown(md: string): string {
  try {
    const out = marked.parse(md, { async: false }) as string;
    return out.trimEnd();
  } catch {
    return md;
  }
}
