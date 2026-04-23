import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Static, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import type { CoreMessage, ToolSet } from "ai";
import { runTurn } from "../agent/loop.js";
import type { AgentEvent } from "../agent/events.js";
import { shouldCompact, runCompaction } from "../agent/compact.js";
import { ConfirmPrompt } from "./ConfirmPrompt.js";
import { renderMarkdown } from "./markdown.js";
import type { Config } from "../config/schema.js";
import type { StoredSession } from "../session/schema.js";
import { sessionStore } from "../session/store.js";
import type { ApprovalResult } from "../tools/bash.js";
import { createBashTool } from "../tools/bash.js";
import { classifyCommand, type Decision } from "../tools/permissions.js";
import type { LanguageModel } from "ai";

interface HistoryItem {
  id: string;
  kind: "user" | "assistant" | "tool" | "system";
  text: string;
}

interface Props {
  config: Config;
  system: string;
  model: LanguageModel;
  baseTools: ToolSet;
  session: StoredSession;
  onPersistConfig: (update: (cfg: Config) => Config) => Promise<Config>;
}

type PendingConfirm = {
  command: string;
  decision: Decision;
  resolve: (result: ApprovalResult) => void;
};

export const Chat: React.FC<Props> = ({
  config: initialConfig,
  system,
  model,
  baseTools,
  session,
  onPersistConfig,
}) => {
  const { exit } = useApp();
  const [configState, setConfigState] = useState<Config>(initialConfig);
  const configRef = useRef(configState);
  configRef.current = configState;

  const [messages, setMessages] = useState<CoreMessage[]>(
    session.messages as unknown as CoreMessage[],
  );
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [streaming, setStreaming] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const pushHistory = (item: HistoryItem) => setHistory((h) => [...h, item]);

  const requestApproval = useCallback(
    (command: string, decision: Decision): Promise<ApprovalResult> =>
      new Promise((resolve) => {
        setPendingConfirm({ command, decision, resolve });
      }),
    [],
  );

  const handleConfirm = useCallback(
    (result: ApprovalResult) => {
      if (pendingConfirm) {
        pendingConfirm.resolve(result);
        setPendingConfirm(null);
      }
    },
    [pendingConfirm],
  );

  const bashTool = useMemo(
    () =>
      createBashTool({
        config: configRef.current,
        requester: { requestApproval },
        onAlwaysAllow: async (pattern) => {
          const updated = await onPersistConfig((cfg) => ({
            ...cfg,
            permissions: {
              ...cfg.permissions,
              autoApprove: Array.from(new Set([...cfg.permissions.autoApprove, pattern])),
            },
          }));
          setConfigState(updated);
        },
      }),
    [requestApproval, onPersistConfig],
  );

  const tools: ToolSet = useMemo(() => ({ bash: bashTool, ...baseTools }), [bashTool, baseTools]);

  const submitUser = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      setInput("");
      setBusy(true);
      setStatusText("thinking...");
      pushHistory({ id: `u-${Date.now()}`, kind: "user", text });

      const nextMessages: CoreMessage[] = [
        ...messagesRef.current,
        { role: "user", content: text } as CoreMessage,
      ];
      setMessages(nextMessages);

      try {
        const iter = runTurn({
          model,
          system,
          messages: nextMessages,
          tools,
        });

        let finalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        let finalMessages: CoreMessage[] = nextMessages;
        let assistantText = "";

        while (true) {
          const step = await iter.next();
          if (step.done) {
            finalMessages = step.value.finalMessages;
            finalUsage = step.value.usage;
            assistantText = step.value.assistantText;
            break;
          }
          handleEvent(step.value);
        }

        setStreaming("");
        if (assistantText.trim()) {
          pushHistory({
            id: `a-${Date.now()}`,
            kind: "assistant",
            text: assistantText,
          });
        }
        setMessages(finalMessages);

        await sessionStore.save(session, finalMessages);

        if (
          shouldCompact(
            finalUsage.promptTokens,
            configRef.current.openrouter.contextWindow,
            configRef.current.compaction.triggerAt,
          )
        ) {
          setStatusText("compacting context...");
          const compacted = await runCompaction(finalMessages, configRef.current.compaction, {
            model,
          });
          if (compacted) {
            setMessages(compacted.messages);
            session.compactedAt = [...session.compactedAt, new Date().toISOString()];
            await sessionStore.save(session, compacted.messages);
            pushHistory({
              id: `sys-${Date.now()}`,
              kind: "system",
              text: `Context compacted (saved ~${finalUsage.promptTokens} tokens).`,
            });
          }
        }
      } catch (err) {
        pushHistory({
          id: `err-${Date.now()}`,
          kind: "system",
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBusy(false);
        setStatusText("");
      }
    },
    [busy, model, system, tools, session],
  );

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "text-delta":
        setStreaming((prev) => prev + event.text);
        break;
      case "text-complete":
        setStreaming("");
        break;
      case "tool-call":
        if (event.toolName === "bash") {
          const args = event.args as { command?: string } | undefined;
          if (args?.command) {
            pushHistory({
              id: `tc-${event.toolCallId}`,
              kind: "tool",
              text: `$ ${args.command}`,
            });
            // classify proactively so the user sees why it auto-approved
            const decision = classifyCommand(args.command, configRef.current.permissions);
            if (decision.kind === "auto-approve") {
              setStatusText(`auto-approved: ${args.command.slice(0, 60)}`);
            }
          }
        } else {
          pushHistory({
            id: `tc-${event.toolCallId}`,
            kind: "tool",
            text: `→ ${event.toolName}(${JSON.stringify(event.args ?? {}).slice(0, 120)})`,
          });
        }
        break;
      case "tool-result": {
        const result =
          typeof event.result === "string" ? event.result : JSON.stringify(event.result, null, 2);
        pushHistory({
          id: `tr-${event.toolCallId}`,
          kind: "tool",
          text: truncateForHistory(result),
        });
        break;
      }
      case "error":
        pushHistory({
          id: `err-${Date.now()}`,
          kind: "system",
          text: `Error: ${event.error.message}`,
        });
        break;
      case "step-finish":
      case "finish":
        break;
    }
  }, []);

  useEffect(() => {
    return () => {
      // persist one last time on unmount
      void sessionStore.save(session, messagesRef.current).catch(() => {});
    };
  }, [session]);

  return (
    <Box flexDirection="column">
      <Static items={history}>
        {(item) => (
          <Box key={item.id} flexDirection="column" marginBottom={1}>
            {renderHistoryItem(item)}
          </Box>
        )}
      </Static>
      {streaming && (
        <Box marginBottom={1}>
          <Text>{renderMarkdown(streaming)}</Text>
        </Box>
      )}
      {pendingConfirm && (
        <ConfirmPrompt
          command={pendingConfirm.command}
          reason={pendingConfirm.decision.reason}
          onAnswer={handleConfirm}
        />
      )}
      <Box>
        {busy ? (
          <Box>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text color="cyan"> {statusText || "working..."}</Text>
          </Box>
        ) : pendingConfirm ? null : (
          <Box>
            <Text color="cyan">› </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={(v) => {
                if (v.trim() === "/exit" || v.trim() === "/quit") {
                  exit();
                  return;
                }
                void submitUser(v);
              }}
              placeholder="Ask kepi code anything... (/exit to quit)"
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

function truncateForHistory(text: string): string {
  const max = 2000;
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n[... output truncated in display ...]";
}

function renderHistoryItem(item: HistoryItem): React.ReactNode {
  switch (item.kind) {
    case "user":
      return (
        <Box flexDirection="column">
          <Text color="green" bold>
            › you
          </Text>
          <Text>{item.text}</Text>
        </Box>
      );
    case "assistant":
      return (
        <Box flexDirection="column">
          <Text color="cyan" bold>
            ❯ kepi
          </Text>
          <Text>{renderMarkdown(item.text)}</Text>
        </Box>
      );
    case "tool":
      return (
        <Box flexDirection="column">
          <Text color="yellow" dimColor>
            {item.text}
          </Text>
        </Box>
      );
    case "system":
      return <Text color="magenta">[{item.text}]</Text>;
  }
}

export default Chat;
