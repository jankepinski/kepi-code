import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./system.js";

describe("buildSystemPrompt", () => {
  it("includes current cwd and platform", () => {
    const prompt = buildSystemPrompt({
      platform: "darwin",
      rules: [],
      skills: [],
      mcpTools: [],
    });
    expect(prompt).toContain(process.cwd());
    expect(prompt).toContain("darwin");
    expect(prompt).toContain("kepi code");
    expect(prompt).toContain("bash");
  });

  it("omits empty rules/skills/mcp sections", () => {
    const prompt = buildSystemPrompt({
      platform: "linux",
      rules: [],
      skills: [],
      mcpTools: [],
    });
    expect(prompt).not.toContain("# Rules");
    expect(prompt).not.toContain("# Available skills");
    expect(prompt).not.toContain("# MCP tools");
  });

  it("includes rules when present", () => {
    const prompt = buildSystemPrompt({
      platform: "linux",
      rules: [{ name: "style", content: "use 2 spaces", path: "/x", scope: "global" }],
      skills: [],
      mcpTools: [],
    });
    expect(prompt).toContain("# Rules");
    expect(prompt).toContain("style");
    expect(prompt).toContain("use 2 spaces");
  });

  it("lists skills with name + description only", () => {
    const prompt = buildSystemPrompt({
      platform: "linux",
      rules: [],
      skills: [
        {
          name: "deploy",
          description: "Deploy to prod",
          path: "/x/deploy/SKILL.md",
          scope: "global",
        },
      ],
      mcpTools: [],
    });
    expect(prompt).toContain("# Available skills");
    expect(prompt).toContain("deploy");
    expect(prompt).toContain("Deploy to prod");
    expect(prompt).toContain("/x/deploy/SKILL.md");
  });

  it("lists MCP tools when present", () => {
    const prompt = buildSystemPrompt({
      platform: "linux",
      rules: [],
      skills: [],
      mcpTools: [{ name: "chrome-click", description: "Click an element" }],
    });
    expect(prompt).toContain("# MCP tools");
    expect(prompt).toContain("chrome-click");
  });

  it("is deterministic for identical input", () => {
    const input = {
      platform: "linux",
      rules: [{ name: "r", content: "c", path: "/p", scope: "global" as const }],
      skills: [{ name: "s", description: "d", path: "/p", scope: "global" as const }],
      mcpTools: [{ name: "t", description: "d" }],
    };
    expect(buildSystemPrompt(input)).toBe(buildSystemPrompt(input));
  });
});
