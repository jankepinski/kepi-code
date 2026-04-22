---
name: install-rule
description: Install a new rule (global or per-project) that kepi code will always inject into the system prompt
---

# Installing a new rule

Rules are always-on instructions injected into every system prompt. Unlike
skills, their full content is shown to the model on every turn — so keep them
short, sharp, and high-signal.

## Locations

- Global: `~/.kepi/rules/<rule-name>.md` (always active)
- Project: `<project>/.kepi/rules/<rule-name>.md` (active only in this project)

Project rules with the same filename override global ones.

## Format

Plain markdown. No frontmatter required — the filename (without `.md`) becomes
the rule name shown to the model.

## How to install

1. Ask the user whether the rule is global or project-scoped.
2. Pick a descriptive kebab-case filename (e.g. `code-style.md`, `no-force-push.md`).
3. Write the rule. A few principles:
   - State the rule imperatively: "Always run `pnpm lint` before committing."
   - Be specific. Vague rules get ignored.
   - Avoid repeating things the agent already knows from context.
   - Prefer many small rules over one long rule.
4. Create the file:

```bash
mkdir -p ~/.kepi/rules
cat > ~/.kepi/rules/<name>.md <<'EOF'
<rule body>
EOF
```

For project rules use `./.kepi/rules/<name>.md` instead.

5. Confirm with the user and mention the rule takes effect on the next session.

## When to prefer a skill over a rule

- If the instruction is only relevant in a specific scenario → skill (loaded on demand).
- If the instruction must be followed on every message → rule.
- Rules cost context on every turn. Skills cost only `name + description`.
