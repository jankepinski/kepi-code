import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("returns empty data when no frontmatter", () => {
    const result = parseFrontmatter("just body text");
    expect(result.data).toEqual({});
    expect(result.body).toBe("just body text");
  });

  it("parses simple key-value frontmatter", () => {
    const raw = `---
name: my-skill
description: Does something
---

Body here`;
    const result = parseFrontmatter(raw);
    expect(result.data).toEqual({ name: "my-skill", description: "Does something" });
    expect(result.body).toBe("Body here");
  });

  it("strips quotes from values", () => {
    const raw = `---
name: "quoted"
desc: 'single'
---
x`;
    const result = parseFrontmatter(raw);
    expect(result.data.name).toBe("quoted");
    expect(result.data.desc).toBe("single");
  });

  it("ignores lines without colon", () => {
    const raw = `---
name: x
garbage line
description: y
---
body`;
    const result = parseFrontmatter(raw);
    expect(result.data).toEqual({ name: "x", description: "y" });
  });

  it("handles missing closing delimiter gracefully", () => {
    const raw = `---
name: x
no closing here`;
    const result = parseFrontmatter(raw);
    expect(result.data).toEqual({});
    expect(result.body).toBe(raw);
  });

  it("preserves multi-line body", () => {
    const raw = `---
name: x
description: y
---
line 1
line 2
line 3`;
    const result = parseFrontmatter(raw);
    expect(result.body).toBe("line 1\nline 2\nline 3");
  });
});
