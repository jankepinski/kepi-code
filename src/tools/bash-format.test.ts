import { describe, it, expect } from "vitest";
import { truncate, formatBashResult } from "./bash-format.js";

describe("truncate", () => {
  it("returns text unchanged when short enough", () => {
    expect(truncate("hello", 100)).toBe("hello");
  });

  it("truncates to head + tail when too long", () => {
    const text = "a".repeat(1000) + "b".repeat(1000);
    const result = truncate(text, 200);
    expect(result.length).toBeLessThan(300);
    expect(result).toContain("truncated");
    expect(result.startsWith("a")).toBe(true);
    expect(result.endsWith("b")).toBe(true);
  });

  it("reports bytes omitted", () => {
    const text = "x".repeat(10000);
    const result = truncate(text, 200);
    expect(result).toMatch(/\d+ bytes truncated/);
  });
});

describe("formatBashResult", () => {
  it("formats successful command with stdout", () => {
    const out = formatBashResult(
      {
        stdout: "hello\n",
        stderr: "",
        exitCode: 0,
        timedOut: false,
        durationMs: 42,
      },
      { maxBytes: 1000 },
    );
    expect(out).toContain("exit code: 0");
    expect(out).toContain("duration: 42ms");
    expect(out).toContain("stdout");
    expect(out).toContain("hello");
    expect(out).not.toContain("stderr");
  });

  it("includes stderr when present", () => {
    const out = formatBashResult(
      {
        stdout: "",
        stderr: "oops",
        exitCode: 1,
        timedOut: false,
        durationMs: 10,
      },
      { maxBytes: 1000 },
    );
    expect(out).toContain("exit code: 1");
    expect(out).toContain("stderr");
    expect(out).toContain("oops");
  });

  it("reports (no output) when both empty", () => {
    const out = formatBashResult(
      { stdout: "", stderr: "", exitCode: 0, timedOut: false, durationMs: 5 },
      { maxBytes: 1000 },
    );
    expect(out).toContain("(no output)");
  });

  it("marks timeout", () => {
    const out = formatBashResult(
      { stdout: "", stderr: "", exitCode: -1, timedOut: true, durationMs: 5000 },
      { maxBytes: 1000 },
    );
    expect(out).toContain("TIMEOUT");
  });

  it("truncates long stdout", () => {
    const out = formatBashResult(
      {
        stdout: "x".repeat(10000),
        stderr: "",
        exitCode: 0,
        timedOut: false,
        durationMs: 1,
      },
      { maxBytes: 500 },
    );
    expect(out).toContain("truncated");
    expect(out.length).toBeLessThan(1000);
  });
});
