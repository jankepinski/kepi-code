import { describe, it, expect } from "vitest";
import type { CoreMessage } from "ai";
import {
  shouldCompact,
  selectMessagesToCompact,
  buildSummaryMessage,
  COMPACT_SUMMARY_PROMPT,
} from "./compact.js";

describe("shouldCompact", () => {
  it("triggers at threshold", () => {
    expect(shouldCompact(80000, 100000, 0.8)).toBe(true);
  });

  it("does not trigger below threshold", () => {
    expect(shouldCompact(50000, 100000, 0.8)).toBe(false);
  });

  it("triggers above threshold", () => {
    expect(shouldCompact(95000, 100000, 0.8)).toBe(true);
  });

  it("returns false for zero context window", () => {
    expect(shouldCompact(100, 0, 0.8)).toBe(false);
  });

  it("triggers exactly at floor(window * triggerAt)", () => {
    const window = 200_000;
    const trigger = 0.8;
    const threshold = Math.floor(window * trigger);
    expect(shouldCompact(threshold - 1, window, trigger)).toBe(false);
    expect(shouldCompact(threshold, window, trigger)).toBe(true);
  });
});

function msg(role: "user" | "assistant", content: string): CoreMessage {
  return { role, content } as CoreMessage;
}

describe("selectMessagesToCompact", () => {
  it("returns empty for empty input", () => {
    const r = selectMessagesToCompact([], 6);
    expect(r.toSummarise).toEqual([]);
    expect(r.toKeep).toEqual([]);
  });

  it("keeps all when less than threshold", () => {
    const msgs = [msg("user", "a"), msg("assistant", "b")];
    const r = selectMessagesToCompact(msgs, 6);
    expect(r.toSummarise).toEqual([]);
    expect(r.toKeep).toEqual(msgs);
  });

  it("splits when more than threshold", () => {
    const msgs = [
      msg("user", "1"),
      msg("assistant", "2"),
      msg("user", "3"),
      msg("assistant", "4"),
      msg("user", "5"),
      msg("assistant", "6"),
      msg("user", "7"),
      msg("assistant", "8"),
    ];
    const r = selectMessagesToCompact(msgs, 3);
    expect(r.toSummarise).toHaveLength(5);
    expect(r.toKeep).toHaveLength(3);
    expect(r.toKeep[0]!.content).toBe("6");
    expect(r.toKeep[2]!.content).toBe("8");
  });

  it("keeps at least 1 message when keepRecent is 0", () => {
    const msgs = [msg("user", "a"), msg("assistant", "b")];
    const r = selectMessagesToCompact(msgs, 0);
    expect(r.toKeep).toHaveLength(1);
  });
});

describe("buildSummaryMessage", () => {
  it("returns system role with placeholder prefix", () => {
    const m = buildSummaryMessage("user did X");
    expect(m.role).toBe("system");
    expect(String(m.content)).toContain("user did X");
    expect(String(m.content)).toContain("Compacted conversation summary");
  });
});

describe("COMPACT_SUMMARY_PROMPT", () => {
  it("mentions what has been done / delivered", () => {
    expect(COMPACT_SUMMARY_PROMPT).toMatch(/done|delivered|achieved/i);
  });

  it("mentions user goals, decisions, files, errors, pending tasks", () => {
    expect(COMPACT_SUMMARY_PROMPT).toMatch(/goals/i);
    expect(COMPACT_SUMMARY_PROMPT).toMatch(/decisions/i);
    expect(COMPACT_SUMMARY_PROMPT).toMatch(/file/i);
    expect(COMPACT_SUMMARY_PROMPT).toMatch(/errors/i);
    expect(COMPACT_SUMMARY_PROMPT).toMatch(/pending/i);
  });
});
