import { streamText, type CoreMessage, type LanguageModel, type ToolSet } from "ai";
import type { AgentEvent } from "./events.js";

export interface RunTurnOptions {
  model: LanguageModel;
  system: string;
  messages: CoreMessage[];
  tools: ToolSet;
  maxSteps?: number;
}

export interface RunTurnResult {
  finalMessages: CoreMessage[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  assistantText: string;
}

/**
 * Runs a single turn of the agent. Streams events through an async iterable
 * for the UI to consume. Returns the final message history (including new
 * assistant + tool messages) and token usage for compaction decisions.
 *
 * Multi-step tool-calling is handled by streamText itself via maxSteps.
 */
export async function* runTurn(
  options: RunTurnOptions,
): AsyncGenerator<AgentEvent, RunTurnResult> {
  const result = streamText({
    model: options.model,
    system: options.system,
    messages: options.messages,
    tools: options.tools,
    maxSteps: options.maxSteps ?? 50,
  });

  let accumulatedText = "";

  try {
    for await (const rawPart of result.fullStream) {
      // ToolSet generic leaves tool-result/tool-call parts with `never`
      // member types, so widen here for uniform handling.
      const part = rawPart as unknown as {
        type: string;
        textDelta?: string;
        toolCallId?: string;
        toolName?: string;
        args?: unknown;
        result?: unknown;
        error?: unknown;
      };
      switch (part.type) {
        case "text-delta": {
          const delta = part.textDelta ?? "";
          accumulatedText += delta;
          yield { type: "text-delta", text: delta };
          break;
        }
        case "tool-call": {
          yield {
            type: "tool-call",
            toolCallId: part.toolCallId ?? "",
            toolName: part.toolName ?? "",
            args: part.args,
          };
          break;
        }
        case "tool-result": {
          yield {
            type: "tool-result",
            toolCallId: part.toolCallId ?? "",
            toolName: part.toolName ?? "",
            result: part.result,
          };
          break;
        }
        case "step-finish": {
          yield { type: "step-finish" };
          break;
        }
        case "error": {
          const err =
            part.error instanceof Error ? part.error : new Error(String(part.error));
          yield { type: "error", error: err };
          break;
        }
        default:
          break;
      }
    }
  } catch (err) {
    yield { type: "error", error: err instanceof Error ? err : new Error(String(err)) };
  }

  const usage = await result.usage;
  const responseMessages = (await result.response).messages;

  const promptTokens = usage.promptTokens ?? 0;
  const completionTokens = usage.completionTokens ?? 0;
  const totalTokens = usage.totalTokens ?? promptTokens + completionTokens;

  if (accumulatedText) {
    yield { type: "text-complete", text: accumulatedText };
  }

  yield {
    type: "finish",
    usage: { promptTokens, completionTokens, totalTokens },
  };

  return {
    finalMessages: [...options.messages, ...(responseMessages as unknown as CoreMessage[])],
    usage: { promptTokens, completionTokens, totalTokens },
    assistantText: accumulatedText,
  };
}
