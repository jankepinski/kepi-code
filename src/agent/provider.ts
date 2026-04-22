import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import type { Config } from "../config/schema.js";

export function createModel(config: Config): LanguageModel {
  const openrouter = createOpenRouter({
    apiKey: config.openrouter.apiKey,
    headers: {
      "HTTP-Referer": "https://github.com/kepi-code/kepi-code",
      "X-Title": "kepi code",
    },
  });
  return openrouter.chat(config.openrouter.model);
}
