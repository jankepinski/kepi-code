import type { ToolSet } from "ai";
import type { Config } from "../config/schema.js";
import type { StoredSession } from "../session/schema.js";
import type { McpBundle } from "../mcp/client.js";
import type { SessionSummary } from "../ui/SessionPicker.js";

export type Phase =
  | { kind: "booting" }
  | { kind: "first-run" }
  | { kind: "picking"; sessions: SessionSummary[]; config: Config }
  | { kind: "loading-session"; config: Config; sessionId: string }
  | {
      kind: "chatting";
      config: Config;
      session: StoredSession;
      system: string;
      baseTools: ToolSet;
      mcp: McpBundle | null;
    }
  | { kind: "error"; message: string };
