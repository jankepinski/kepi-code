import React from "react";
import { Box, Text } from "ink";
import type { Config } from "../config/schema.js";
import { createModel } from "../agent/provider.js";
import FirstRunWizard from "../bootstrap/wizard.js";
import SessionPicker, { type PickResult } from "./SessionPicker.js";
import Chat from "./Chat.js";
import type { Phase } from "../types/phase.js";

export interface PhaseRouterProps {
  phase: Phase;
  onPick: (result: PickResult) => void;
  onFirstRunDone: () => void;
  onPersistConfig: (update: (cfg: Config) => Config) => Promise<Config>;
}

export const PhaseRouter: React.FC<PhaseRouterProps> = ({
  phase,
  onPick,
  onFirstRunDone,
  onPersistConfig,
}) => {
  switch (phase.kind) {
    case "booting":
      return <Text color="cyan">Loading kepi code...</Text>;
    case "error":
      return (
        <Box flexDirection="column">
          <Text color="red">Error: {phase.message}</Text>
        </Box>
      );
    case "first-run":
      return <FirstRunWizard onDone={onFirstRunDone} />;
    case "picking":
      return <SessionPicker sessions={phase.sessions} onPick={onPick} />;
    case "loading-session":
      return <Text>Loading session...</Text>;
    case "chatting":
      return (
        <Chat
          config={phase.config}
          system={phase.system}
          model={createModel(phase.config)}
          baseTools={phase.baseTools}
          session={phase.session}
          onPersistConfig={onPersistConfig}
        />
      );
  }
};

export default PhaseRouter;
