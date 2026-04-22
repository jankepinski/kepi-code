export type AgentEvent =
  | { type: "text-delta"; text: string }
  | { type: "text-complete"; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }
  | { type: "tool-result"; toolCallId: string; toolName: string; result: unknown }
  | { type: "step-finish" }
  | {
      type: "finish";
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
    }
  | { type: "error"; error: Error };
