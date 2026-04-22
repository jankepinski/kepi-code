import { describe, it, expect, vi } from "vitest";
import { createBashTool, type ApprovalResult } from "./bash.js";
import type { Config } from "../config/schema.js";

const baseConfig: Config = {
  openrouter: { apiKey: "sk", model: "x/y", contextWindow: 100000 },
  permissions: {
    autoApprove: ["ls", "echo"],
    alwaysDeny: ["rm -rf /"],
  },
  compaction: { triggerAt: 0.8, keepRecentMessages: 6 },
};

function mockExec(stdout: string, stderr = "", exitCode = 0) {
  // The tool calls exec("bash", ["-c", cmd], opts). Return a thenable shape
  // that matches what execa resolves to.
  return vi.fn().mockResolvedValue({
    stdout,
    stderr,
    exitCode,
    timedOut: false,
  }) as unknown as typeof import("execa").execa;
}

function approver(result: ApprovalResult) {
  return {
    requestApproval: vi.fn().mockResolvedValue(result),
  };
}

describe("createBashTool", () => {
  it("runs auto-approved command without asking", async () => {
    const requester = approver({ kind: "approve" });
    const bashTool = createBashTool({
      config: baseConfig,
      cwd: "/tmp",
      requester,
      exec: mockExec("hi\n"),
    });
    const result = await bashTool.execute!(
      { command: "echo hi" },
      { messages: [], toolCallId: "t1" },
    );
    expect(requester.requestApproval).not.toHaveBeenCalled();
    expect(result).toContain("hi");
    expect(result).toContain("exit code: 0");
  });

  it("requests approval for unknown command", async () => {
    const requester = approver({ kind: "approve" });
    const bashTool = createBashTool({
      config: baseConfig,
      cwd: "/tmp",
      requester,
      exec: mockExec("ok"),
    });
    await bashTool.execute!(
      { command: "npm install" },
      { messages: [], toolCallId: "t2" },
    );
    expect(requester.requestApproval).toHaveBeenCalledOnce();
  });

  it("returns [DENIED] for alwaysDeny command", async () => {
    const requester = approver({ kind: "approve" });
    const exec = mockExec("should not run");
    const bashTool = createBashTool({
      config: baseConfig,
      cwd: "/tmp",
      requester,
      exec,
    });
    const result = await bashTool.execute!(
      { command: "rm -rf /" },
      { messages: [], toolCallId: "t3" },
    );
    expect(result).toMatch(/DENIED/);
    expect(requester.requestApproval).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  it("respects user denial of confirm prompt", async () => {
    const requester = approver({ kind: "deny" });
    const exec = mockExec("x");
    const bashTool = createBashTool({
      config: baseConfig,
      cwd: "/tmp",
      requester,
      exec,
    });
    const result = await bashTool.execute!(
      { command: "npm install" },
      { messages: [], toolCallId: "t4" },
    );
    expect(result).toMatch(/DENIED by user/);
    expect(exec).not.toHaveBeenCalled();
  });

  it("calls onAlwaysAllow when user chooses approve-always", async () => {
    const requester = approver({ kind: "approve-always", pattern: "npm" });
    const onAlwaysAllow = vi.fn();
    const bashTool = createBashTool({
      config: baseConfig,
      cwd: "/tmp",
      requester,
      exec: mockExec("ok"),
      onAlwaysAllow,
    });
    await bashTool.execute!(
      { command: "npm install" },
      { messages: [], toolCallId: "t5" },
    );
    expect(onAlwaysAllow).toHaveBeenCalledWith("npm");
  });
});
