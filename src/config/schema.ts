import { z } from "zod";

export const openrouterSchema = z.object({
  apiKey: z.string().min(1, "OpenRouter API key is required"),
  model: z.string().default("anthropic/claude-sonnet-4"),
  contextWindow: z.number().int().positive().default(200000),
});

export const permissionsSchema = z.object({
  autoApprove: z
    .array(z.string())
    .default([
      "ls",
      "cat",
      "rg",
      "grep",
      "find",
      "git status",
      "git diff",
      "git log",
      "git branch",
      "pwd",
      "echo",
      "which",
      "whoami",
      "head",
      "tail",
      "wc",
      "sort",
      "uniq",
    ]),
  alwaysDeny: z
    .array(z.string())
    .default(["rm -rf /", "sudo rm", ":(){ :|:& };:", "mkfs", "dd if=", "> /dev/sda"]),
});

export const compactionSchema = z.object({
  triggerAt: z.number().min(0.1).max(0.99).default(0.8),
  keepRecentMessages: z.number().int().positive().default(6),
});

export const configSchema = z.object({
  openrouter: openrouterSchema,
  permissions: permissionsSchema.default({}),
  compaction: compactionSchema.default({}),
});

export const partialConfigSchema = z
  .object({
    openrouter: openrouterSchema.partial().optional(),
    permissions: permissionsSchema.partial().optional(),
    compaction: compactionSchema.partial().optional(),
  })
  .partial();

export type Config = z.infer<typeof configSchema>;
export type PartialConfig = z.infer<typeof partialConfigSchema>;
