import { CWD } from "../config/paths.js";
import type { Skill } from "./skills.js";
import type { Rule } from "./rules.js";

export interface McpToolDescriptor {
  name: string;
  description: string;
}

export interface SystemPromptInput {
  platform: string;
  rules: Rule[];
  skills: Skill[];
  mcpTools: McpToolDescriptor[];
}

/**
 * Build the system prompt sent to the LLM. Pure function — deterministic
 * output for a given input, used as the contract for snapshot tests.
 */
export function buildSystemPrompt(input: SystemPromptInput): string {
  const sections: string[] = [];

  sections.push(
    [
      "You are kepi code, a minimalist coding agent.",
      "You have ONE real built-in tool: bash. Use it for everything — reading files (cat, rg),",
      "searching (rg, find), editing (sed, heredoc), running git, running tests, anything CLI.",
      "Do not ask for more specialized tools; compose bash invocations instead.",
      "",
      `Current working directory: ${CWD}`,
      `OS platform: ${input.platform}`,
    ].join("\n"),
  );

  if (input.rules.length > 0) {
    const rulesText = input.rules
      .map((r) => `## ${r.name} (${r.scope})\n${r.content}`)
      .join("\n\n");
    sections.push(`# Rules\n\n${rulesText}`);
  }

  if (input.skills.length > 0) {
    const skillList = input.skills
      .map((s) => `- **${s.name}** (${s.scope}): ${s.description}\n  Path: \`${s.path}\``)
      .join("\n");
    sections.push(
      [
        "# Available skills",
        "",
        "Skills are on-demand instructions. Only their name and description are",
        "shown here. When a skill is relevant to the task, read the full SKILL.md",
        "with `cat <path>` before proceeding.",
        "",
        skillList,
      ].join("\n"),
    );
  }

  if (input.mcpTools.length > 0) {
    const toolList = input.mcpTools.map((t) => `- **${t.name}**: ${t.description}`).join("\n");
    sections.push(`# MCP tools available\n\n${toolList}`);
  }

  return sections.join("\n\n");
}
