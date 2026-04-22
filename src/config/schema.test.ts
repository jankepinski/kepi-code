import { describe, it, expect } from "vitest";
import { configSchema, partialConfigSchema } from "./schema.js";

describe("configSchema", () => {
  it("parses minimal valid config", () => {
    const result = configSchema.parse({
      openrouter: { apiKey: "sk-xxx" },
    });
    expect(result.openrouter.model).toBe("anthropic/claude-sonnet-4");
    expect(result.openrouter.contextWindow).toBe(200000);
    expect(result.permissions.autoApprove).toContain("ls");
    expect(result.compaction.triggerAt).toBe(0.8);
  });

  it("rejects missing apiKey", () => {
    expect(() => configSchema.parse({ openrouter: {} })).toThrow();
  });

  it("rejects empty apiKey", () => {
    expect(() => configSchema.parse({ openrouter: { apiKey: "" } })).toThrow();
  });

  it("rejects triggerAt out of range", () => {
    expect(() =>
      configSchema.parse({
        openrouter: { apiKey: "sk" },
        compaction: { triggerAt: 1.5 },
      }),
    ).toThrow();
  });

  it("accepts custom model", () => {
    const result = configSchema.parse({
      openrouter: { apiKey: "sk", model: "openai/gpt-4o" },
    });
    expect(result.openrouter.model).toBe("openai/gpt-4o");
  });
});

describe("partialConfigSchema", () => {
  it("accepts empty object", () => {
    expect(partialConfigSchema.parse({})).toEqual({});
  });

  it("accepts partial openrouter override", () => {
    const result = partialConfigSchema.parse({
      openrouter: { model: "x/y" },
    });
    expect(result.openrouter?.model).toBe("x/y");
  });

  it("accepts just permissions override", () => {
    const result = partialConfigSchema.parse({
      permissions: { autoApprove: ["ls"] },
    });
    expect(result.permissions?.autoApprove).toEqual(["ls"]);
  });
});
