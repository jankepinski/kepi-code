import { z } from "zod";

export const mcpServerSpecSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
});

export const mcpConfigSchema = z.object({
  servers: z.record(mcpServerSpecSchema).default({}),
});

export type McpServerSpec = z.infer<typeof mcpServerSpecSchema>;
export type McpConfig = z.infer<typeof mcpConfigSchema>;
