import { z } from "zod";

// Loose schema for ModelMessage from AI SDK. We don't attempt to fully
// validate message parts — just enough to round-trip safely.
const rolePartSchema = z.union([z.string(), z.array(z.record(z.any())), z.any()]);

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: rolePartSchema,
});

export const sessionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  cwd: z.string(),
  model: z.string(),
  title: z.string().optional(),
  compactedAt: z.array(z.string()).default([]),
  messages: z.array(messageSchema),
});

export type StoredSession = z.infer<typeof sessionSchema>;
