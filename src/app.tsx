import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import type { ToolSet } from "ai";
import { loadConfig, writeGlobalConfig } from "./config/load.js";
import { paths } from "./config/paths.js";
import type { Config } from "./config/schema.js";
import { sessionStore } from "./session/store.js";
import type { StoredSession } from "./session/schema.js";
import { loadSkills } from "./context/skills.js";
import { loadRules } from "./context/rules.js";
import { buildSystemPrompt } from "./context/system.js";
import { loadMcpConfig } from "./mcp/config.js";
import { connectMcpServers, type McpBundle } from "./mcp/client.js";
import { createModel } from "./agent/provider.js";
import FirstRunWizard from "./bootstrap/wizard.js";
import SessionPicker, { type PickResult, type SessionSummary } from "./ui/SessionPicker.js";
import Chat from "./ui/Chat.js";

export enum Action {
  New = "new",
  Continue = "continue",
  Menu = "menu",
}

export interface AppProps {
  action: Action;
}

type Phase =
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

export const App: React.FC<AppProps> = ({ action }) => {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>({ kind: "booting" });

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const config = await loadConfig();
      if (!config) {
        setPhase({ kind: "first-run" });
        return;
      }
      const list = await sessionStore.list();

      switch (action) {
        case Action.New:
          await startChat(config, null);
          return;
        case Action.Continue:
          await startChat(config, await sessionStore.findLastForCwd());
          return;
        case Action.Menu:
          setPhase({ kind: "picking", sessions: list, config });
          return;
      }
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function startChat(config: Config, existing: StoredSession | null) {
    const session = existing ?? sessionStore.createDraft({ model: config.openrouter.model });

    const [skills, rules, mcpCfg] = await Promise.all([
      loadSkills({
        globalDir: paths.globalSkills,
        projectDir: paths.projectSkills,
      }),
      loadRules({
        globalDir: paths.globalRules,
        projectDir: paths.projectRules,
      }),
      loadMcpConfig({
        globalPath: paths.globalMcp,
        projectPath: paths.projectMcp,
      }),
    ]);

    const mcp = Object.keys(mcpCfg.servers).length > 0 ? await connectMcpServers(mcpCfg) : null;

    const system = buildSystemPrompt({
      platform: process.platform,
      rules,
      skills,
      mcpTools: mcp?.descriptors ?? [],
    });

    setPhase({
      kind: "chatting",
      config,
      session,
      system,
      baseTools: mcp?.tools ?? {},
      mcp,
    });
  }

  async function persistConfig(update: (cfg: Config) => Config): Promise<Config> {
    if (phase.kind !== "chatting") throw new Error("not chatting");
    const updated = update(phase.config);
    await writeGlobalConfig(updated);
    setPhase({ ...phase, config: updated });
    return updated;
  }

  function handlePick(result: PickResult) {
    if (result.kind === "exit") {
      exit();
      return;
    }
    if (phase.kind !== "picking") return;
    if (result.kind === "new") {
      void startChat(phase.config, null);
    } else {
      setPhase({
        kind: "loading-session",
        config: phase.config,
        sessionId: result.id,
      });
      void sessionStore.load(result.id).then((loaded) => {
        if (!loaded) {
          setPhase({ kind: "error", message: "Failed to load session" });
          return;
        }
        void startChat(phase.config, loaded);
      });
    }
  }

  useEffect(() => {
    return () => {
      if (phase.kind === "chatting" && phase.mcp) {
        void phase.mcp.close();
      }
    };
  }, [phase]);

  if (phase.kind === "booting") return <Text color="cyan">Loading kepi code...</Text>;
  if (phase.kind === "error")
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {phase.message}</Text>
      </Box>
    );
  if (phase.kind === "first-run") {
    return (
      <FirstRunWizard
        onDone={() => {
          setPhase({ kind: "booting" });
          void bootstrap();
        }}
      />
    );
  }
  if (phase.kind === "picking") {
    return <SessionPicker sessions={phase.sessions} onPick={handlePick} />;
  }
  if (phase.kind === "loading-session") {
    return <Text>Loading session...</Text>;
  }
  if (phase.kind === "chatting") {
    return (
      <Chat
        config={phase.config}
        system={phase.system}
        model={createModel(phase.config)}
        baseTools={phase.baseTools}
        session={phase.session}
        onPersistConfig={persistConfig}
      />
    );
  }
  return null;
};

export default App;
