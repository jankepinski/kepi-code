# kepi code

Ultra-lightweight coding agent CLI. Powered by OpenRouter. One tool: bash.

## Philosophy

Minimum built-in features, maximum freedom for the LLM. Where other agents
ship with `read_file`, `edit_file`, `glob`, `grep`, `web_search` and a dozen
other narrow tools, kepi code ships with exactly one: `bash`. The model uses
`cat`, `rg`, `sed`, heredocs, `git`, and the rest of the Unix toolbox the same
way a human would. Extra capabilities come from MCP servers if you want them.

Other things kepi code deliberately does not have:

- No TODO manager / task tracker / plans
- No plan/ask/yolo modes
- No subagents
- No telemetry

What it does have:

- Sessions (resume / continue / list)
- Auto-compaction when context window fills up
- Skills and rules (global and per-project)
- MCP servers
- Interactive permission prompts for shell commands
- Streaming output with markdown rendering

## Install

```bash
npm install -g kepi-code
```

Then run:

```bash
kepi
```

On first launch a wizard asks for your [OpenRouter API key](https://openrouter.ai/keys).

## Commands

```bash
kepi                  # open session picker
kepi --new            # start a new session
kepi --continue       # resume last session in this cwd
kepi --resume <id>    # resume a specific session
```

Inside the REPL: type your prompt, press enter. `/exit` or `Ctrl+C` to quit.

## Layout

- `~/.kepi/config.json` — global config
- `~/.kepi/mcp.json` — MCP servers
- `~/.kepi/skills/<name>/SKILL.md` — global skills
- `~/.kepi/rules/<name>.md` — global rules
- `~/.kepi/sessions/*.json` — session persistence

Per-project overrides live in `<project>/.kepi/`. Project values win on conflicts.

## Config

```json
{
  "openrouter": {
    "apiKey": "sk-or-...",
    "model": "anthropic/claude-sonnet-4",
    "contextWindow": 200000
  },
  "permissions": {
    "autoApprove": ["ls", "cat", "rg", "grep", "git status", "git diff"],
    "alwaysDeny": ["rm -rf /", "sudo rm"]
  },
  "compaction": {
    "triggerAt": 0.8,
    "keepRecentMessages": 6
  }
}
```

`autoApprove` entries are prefix-matched against the first segment of each
pipeline. Destructive patterns (`rm`, `sudo`, `chmod`, `chown`, `dd`,
`git push --force`, `curl | sh`, redirects to non-/tmp paths) always require
confirmation even if matched by autoApprove.

## Skills

Skills are markdown files with YAML frontmatter. Only `name` and `description`
are shown to the model in the system prompt — the full body is read on demand
by the agent via `cat`.

```markdown
---
name: deploy-prod
description: Deploy the app to production via the kubectl helper
---

Steps the agent should follow when the user asks to deploy...
```

Two meta-skills are installed on first run: `install-skill` teaches the agent
how to add new skills, and `install-rule` teaches it how to add new rules.

## Rules

Rules are plain markdown files. The filename becomes the rule name. All rules
are injected into every system prompt, so keep them short and focused.

## MCP

Configure stdio MCP servers in `~/.kepi/mcp.json`:

```json
{
  "servers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp"]
    }
  }
}
```

Tools exposed by MCP servers appear alongside `bash` in the model's toolset,
namespaced as `<server>__<tool>`. MCP tools always require user confirmation
before running (they're black boxes to the permission classifier).

## Auto-compaction

When `usage.promptTokens` (reported by OpenRouter) exceeds
`contextWindow * triggerAt` (default 80%), kepi code summarises all but the
last `keepRecentMessages` (default 6) messages into a single system message
and continues. The summary preserves goals, decisions, what was already
delivered, file paths, errors, and pending tasks.

## Development

```bash
npm install
npm run dev            # runs via tsx with hot reload
npm test               # vitest
npm run test:watch
npm run test:coverage
npm run lint
npm run typecheck
npm run build          # tsup → dist/cli.js
```

Local install to test the global binary:

```bash
npm run build
npm link
kepi
```

## License

MIT
