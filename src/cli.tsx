import React from "react";
import { render } from "ink";
import { Command, Option } from "commander";
import App, { Action } from "./app.js";

const program = new Command();

program
  .name("kepi")
  .description("kepi code - ultra lightweight coding agent")
  .version("0.1.0")
  .addOption(
    new Option(
      `--${Action.New}`,
      "start a new session (skip picker)",
    ).conflicts([Action.Continue, Action.Resume]),
  )
  .addOption(
    new Option(
      `--${Action.Continue}`,
      "continue most recent session from this cwd",
    ).conflicts([Action.New, Action.Resume]),
  )
  .addOption(
    new Option(
      `--${Action.Resume} <id>`,
      "resume a specific session by id",
    ).conflicts([Action.New, Action.Continue]),
  )
  .parse(process.argv);

const opts = program.opts<{
  [Action.New]?: boolean;
  [Action.Continue]?: boolean;
  [Action.Resume]?: string;
}>();

const resumeId = opts[Action.Resume]?.trim();
if (opts[Action.Resume] !== undefined && !resumeId) {
  program.error(`option '--${Action.Resume} <id>' requires a non-empty session id`);
}

const action: Action = (() => {
  if (resumeId) return Action.Resume;
  if (opts[Action.New]) return Action.New;
  if (opts[Action.Continue]) return Action.Continue;
  return Action.Menu;
})();

render(
  <App
    cwd={process.cwd()}
    action={action}
    {...(resumeId ? { resumeId } : {})}
  />,
);
