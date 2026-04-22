import { generateText, type CoreMessage, type LanguageModel } from "ai";

export interface CompactionConfig {
  triggerAt: number;
  keepRecentMessages: number;
}

export const COMPACT_SUMMARY_PROMPT = [
  "Summarize this conversation preserving:",
  "- User goals",
  "- Key decisions made",
  "- What has already been done / delivered / achieved so far",
  "- File paths that were touched or referenced",
  "- Errors encountered and how they were resolved",
  "- Pending tasks and open questions",
  "",
  "Return plain text, no markdown headers. Be concise but complete.",
].join("\n");

/**
 * Pure function. Decides whether compaction should trigger given the latest
 * usage numbers from OpenRouter and the configured context window.
 */
export function shouldCompact(
  promptTokens: number,
  contextWindow: number,
  triggerAt: number,
): boolean {
  if (contextWindow <= 0) return false;
  return promptTokens >= Math.floor(contextWindow * triggerAt);
}

/**
 * Pure function. Splits the message history into the portion that will be
 * summarised and the tail that will be kept verbatim. Never drops the most
 * recent user message even if keepRecent is 0.
 */
export function selectMessagesToCompact(
  messages: CoreMessage[],
  keepRecent: number,
): { toSummarise: CoreMessage[]; toKeep: CoreMessage[] } {
  if (messages.length === 0) {
    return { toSummarise: [], toKeep: [] };
  }
  const keep = Math.max(1, keepRecent);
  if (messages.length <= keep) {
    return { toSummarise: [], toKeep: messages };
  }
  const splitAt = messages.length - keep;
  return {
    toSummarise: messages.slice(0, splitAt),
    toKeep: messages.slice(splitAt),
  };
}

/** Build the summary placeholder message that replaces compacted history. */
export function buildSummaryMessage(summary: string): CoreMessage {
  return {
    role: "system",
    content: `[Compacted conversation summary]\n\n${summary}`,
  };
}

export interface CompactDeps {
  model: LanguageModel;
}

/**
 * Runs the actual LLM summarisation call. Isolated from decision logic so the
 * pure parts (shouldCompact, selectMessagesToCompact, buildSummaryMessage) can
 * be tested without network.
 */
export async function runCompaction(
  messages: CoreMessage[],
  config: CompactionConfig,
  deps: CompactDeps,
): Promise<{ messages: CoreMessage[]; summary: string } | null> {
  const { toSummarise, toKeep } = selectMessagesToCompact(messages, config.keepRecentMessages);
  if (toSummarise.length === 0) return null;

  const result = await generateText({
    model: deps.model,
    system: COMPACT_SUMMARY_PROMPT,
    messages: toSummarise,
  });

  const summaryMsg = buildSummaryMessage(result.text);
  return {
    messages: [summaryMsg, ...toKeep],
    summary: result.text,
  };
}
