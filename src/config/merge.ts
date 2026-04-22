import type { Config, PartialConfig } from "./schema.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merges two config objects. Project values override global values.
 * Arrays are replaced (not concatenated) so user can shrink lists in a project.
 */
export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepMerge(current, value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function mergeConfigs(global: Config, project: PartialConfig | null): Config {
  if (!project) return global;
  return deepMerge(global, project as Partial<Config>);
}
