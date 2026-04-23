import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { StoredSession } from "../session/schema.js";
import { CWD } from "../config/paths.js";

export type PickResult = { kind: "new" } | { kind: "resume"; id: string } | { kind: "exit" };

export interface SessionSummary extends Pick<StoredSession, "id" | "updatedAt" | "cwd" | "model"> {
  title?: string | undefined;
}

interface Props {
  sessions: SessionSummary[];
  onPick: (result: PickResult) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return iso;
  }
}

export const SessionPicker: React.FC<Props> = ({ sessions, onPick }) => {
  const items = [
    { label: "Start new session", id: "__new__" as const },
    ...sessions.map((s) => ({
      label: `${formatDate(s.updatedAt)}  ${s.cwd === CWD ? "*" : " "} ${s.title ?? s.id.slice(0, 8)}`,
      id: s.id,
    })),
  ];
  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    else if (key.downArrow) setIndex((i) => Math.min(items.length - 1, i + 1));
    else if (key.return) {
      const picked = items[index];
      if (!picked) return;
      if (picked.id === "__new__") onPick({ kind: "new" });
      else onPick({ kind: "resume", id: picked.id });
    } else if (input === "q" || (key.ctrl && input === "c")) {
      onPick({ kind: "exit" });
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        kepi code
      </Text>
      <Text dimColor>{`Pick a session  ·  ↑/↓ to move  ·  enter to select  ·  q to quit`}</Text>
      <Text dimColor>cwd: {CWD}</Text>
      <Box marginTop={1} flexDirection="column">
        {items.map((item, i) =>
          i === index ? (
            <Text key={item.id} color="cyan">
              {"❯ "}
              {item.label}
            </Text>
          ) : (
            <Text key={item.id}>
              {"  "}
              {item.label}
            </Text>
          ),
        )}
      </Box>
    </Box>
  );
};

export default SessionPicker;
