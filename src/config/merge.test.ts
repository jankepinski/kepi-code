import { describe, it, expect } from "vitest";
import { deepMerge, mergeConfigs } from "./merge.js";
import type { Config } from "./schema.js";

const baseConfig: Config = {
  openrouter: {
    apiKey: "sk-global",
    model: "anthropic/claude-sonnet-4",
    contextWindow: 200000,
  },
  permissions: {
    autoApprove: ["ls", "cat"],
    alwaysDeny: ["rm -rf /"],
  },
  compaction: {
    triggerAt: 0.8,
    keepRecentMessages: 6,
  },
};

describe("deepMerge", () => {
  it("returns base when override is empty", () => {
    const result = deepMerge({ a: 1, b: 2 }, {});
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("overrides primitive values", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 99 });
    expect(result).toEqual({ a: 1, b: 99 });
  });

  it("deep-merges nested objects", () => {
    const result = deepMerge({ a: { x: 1, y: 2 } }, { a: { y: 99 } });
    expect(result).toEqual({ a: { x: 1, y: 99 } });
  });

  it("replaces arrays (does not concatenate)", () => {
    const result = deepMerge({ items: [1, 2, 3] }, { items: [9] });
    expect(result).toEqual({ items: [9] });
  });

  it("ignores undefined values in override", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: undefined });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("does not mutate inputs", () => {
    const base = { a: { x: 1 } };
    const override = { a: { x: 99 } };
    deepMerge(base, override);
    expect(base).toEqual({ a: { x: 1 } });
    expect(override).toEqual({ a: { x: 99 } });
  });
});

describe("mergeConfigs", () => {
  it("returns global when project is null", () => {
    expect(mergeConfigs(baseConfig, null)).toEqual(baseConfig);
  });

  it("overrides openrouter.model from project", () => {
    const result = mergeConfigs(baseConfig, {
      openrouter: { model: "openai/gpt-4o" },
    });
    expect(result.openrouter.model).toBe("openai/gpt-4o");
    expect(result.openrouter.apiKey).toBe("sk-global");
  });

  it("replaces autoApprove array entirely", () => {
    const result = mergeConfigs(baseConfig, {
      permissions: { autoApprove: ["only-this"] },
    });
    expect(result.permissions.autoApprove).toEqual(["only-this"]);
  });

  it("preserves unrelated sections", () => {
    const result = mergeConfigs(baseConfig, {
      compaction: { triggerAt: 0.9 },
    });
    expect(result.openrouter).toEqual(baseConfig.openrouter);
    expect(result.compaction.triggerAt).toBe(0.9);
    expect(result.compaction.keepRecentMessages).toBe(6);
  });
});
