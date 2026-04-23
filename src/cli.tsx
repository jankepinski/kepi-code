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
    new Option(`--${Action.New}`, "start a new session (skip picker)").conflicts([Action.Continue]),
  )
  .addOption(
    new Option(`--${Action.Continue}`, "continue most recent session from this cwd").conflicts([
      Action.New,
    ]),
  )
  .parse(process.argv);

const opts = program.opts();

function getAction() {
  if (opts[Action.New]) return Action.New;
  if (opts[Action.Continue]) return Action.Continue;
}

render(<App action={getAction()} />);
