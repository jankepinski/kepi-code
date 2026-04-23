import { useEffect, useState } from "react";
import { useApp } from "ink";
import { Action } from "../types/action.js";
import { loadConfig, writeGlobalConfig } from "../config/load.js";
import { paths } from "../config/paths.js";
import type { Config } from "../config/schema.js";
import { sessionStore } from "../session/store.js";
import type { StoredSession } from "../session/schema.js";
import { loadSkills } from "../context/skills.js";
import { loadRules } from "../context/rules.js";
import { buildSystemPrompt } from "../context/system.js";
import { loadMcpConfig } from "../mcp/config.js";
import { connectMcpServers } from "../mcp/client.js";
import type { PickResult } from "../ui/SessionPicker.js";
import type { Phase } from "../types/phase.js";

export interface UseAppPhaseResult {
  phase: Phase;
  handlePick: (result: PickResult) => void;
  handleFirstRunDone: () => void;
  persistConfig: (update: (cfg: Config) => Config) => Promise<Config>;
}

export function useAppPhase(action?: Action): UseAppPhaseResult {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>({ kind: "booting" });

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
        default:
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

  function handleFirstRunDone() {
    setPhase({ kind: "booting" });
    void bootstrap();
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    return () => {
      if (phase.kind === "chatting" && phase.mcp) {
        void phase.mcp.close();
      }
    };
  }, [phase]);

  return { phase, handlePick, handleFirstRunDone, persistConfig };
}
