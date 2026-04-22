import React from "react";
import { Box, Text, useInput } from "ink";
import type { ApprovalResult } from "../tools/bash.js";

interface Props {
  command: string;
  reason: string;
  onAnswer: (answer: ApprovalResult) => void;
}

export const ConfirmPrompt: React.FC<Props> = ({ command, reason, onAnswer }) => {
  useInput((input) => {
    const key = input.toLowerCase();
    if (key === "y" || input === "\r") {
      onAnswer({ kind: "approve" });
    } else if (key === "a") {
      const firstWord = command.trim().split(/\s+/)[0] ?? command.trim();
      onAnswer({ kind: "approve-always", pattern: firstWord });
    } else if (key === "n" || key === "q") {
      onAnswer({ kind: "deny" });
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text color="yellow" bold>
        Confirm shell command
      </Text>
      <Text dimColor>{reason}</Text>
      <Box marginTop={1}>
        <Text color="white" wrap="wrap">
          $ {command}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          <Text color="green">[y]</Text> run once   <Text color="cyan">[a]</Text> always allow this prefix   <Text color="red">[n]</Text> skip
        </Text>
      </Box>
    </Box>
  );
};

export default ConfirmPrompt;
