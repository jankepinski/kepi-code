export interface ParsedFrontmatter {
  data: Record<string, string>;
  body: string;
}

/**
 * Minimal YAML frontmatter parser — only supports `key: value` pairs on single
 * lines, values may be quoted or unquoted. We deliberately avoid a full YAML
 * dependency. If the file doesn't start with `---`, returns { data: {}, body }.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const lines = raw.split("\n");
  if (lines[0]?.trim() !== "---") {
    return { data: {}, body: raw };
  }

  const data: Record<string, string> = {};
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "---") {
      endIndex = i;
      break;
    }
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (match) {
      const key = match[1]!;
      let value = match[2]!.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }

  if (endIndex === -1) {
    return { data: {}, body: raw };
  }

  const body = lines.slice(endIndex + 1).join("\n").replace(/^\n+/, "");
  return { data, body };
}
