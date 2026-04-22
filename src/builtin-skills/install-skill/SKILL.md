---
name: install-skill
description: Install a new skill (global or per-project) that kepi code will load on next start
---

# Installing a new skill

Skills are markdown files with YAML frontmatter that give kepi code on-demand
instructions. Only the `name` and `description` are shown in the system prompt —
the full body is read by the agent only when the skill is relevant.

## Locations

- Global: `~/.kepi/skills/<skill-name>/SKILL.md` (available in every project)
- Project: `<project>/.kepi/skills/<skill-name>/SKILL.md` (only in this project)

Project skills override global skills with the same `name`.

## Required frontmatter

```markdown
---
name: <kebab-case-name>
description: <one-sentence description shown in the system prompt>
---

<body with detailed instructions for the LLM>
```

Both `name` and `description` are REQUIRED. Files missing either field are
silently skipped at load time.

## How to install

Ask the user where the skill should live (global vs project-scoped), then:

1. Decide on a kebab-case `name` based on what the skill does.
2. Write a single-sentence `description` that starts with a verb
   ("Deploy...", "Format...", "Summarize..."). This is the only hint the
   agent will see before deciding to read the full skill — make it clear and
   concrete.
3. Write the body: concrete steps, examples, edge cases, commands to run.
   Prefer imperative voice ("Run `x`", "Check if `y`"). Avoid flowery prose.
4. Create the directory and `SKILL.md` file:

```bash
mkdir -p ~/.kepi/skills/<name>
cat > ~/.kepi/skills/<name>/SKILL.md <<'EOF'
---
name: <name>
description: <description>
---

<body>
EOF
```

For project-scoped skills use `./.kepi/skills/<name>/SKILL.md` instead.

5. Confirm with the user that the skill was installed and mention that it will
   be loaded on the next kepi session start.

## Guidelines for writing skill bodies

- Keep them action-oriented. Assume the agent has access to bash and can read
  any file with `cat`.
- Include exact commands where possible, not paraphrases.
- If the skill depends on project state (files, env vars), start with a
  "Preconditions" section that lists checks to run first.
- Cross-reference related skills by name, not by path.
