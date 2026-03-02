import { describe, expect, it } from "vitest";
import { parseFrontmatter, serializeFrontmatter } from "../src/frontmatter.js";

describe("parseFrontmatter", () => {
	it("parses string fields", () => {
		const raw = `---
date: 2026-02-28T14:30:00Z
type: compaction
project: /Users/xxx/Code/my-project
---

## Goal
Refactor auth module`;

		const { meta, body } = parseFrontmatter(raw);
		expect(meta.date).toBe("2026-02-28T14:30:00Z");
		expect(meta.type).toBe("compaction");
		expect(meta.project).toBe("/Users/xxx/Code/my-project");
		expect(body).toBe("## Goal\nRefactor auth module");
	});

	it("parses inline array fields", () => {
		const raw = `---
tags: [auth, refactor, jwt]
---

content here`;

		const { meta } = parseFrontmatter(raw);
		expect(meta.tags).toEqual(["auth", "refactor", "jwt"]);
	});

	it("returns empty meta and full body when no frontmatter", () => {
		const raw = "just some text\nno frontmatter";
		const { meta, body } = parseFrontmatter(raw);
		expect(meta).toEqual({});
		expect(body).toBe(raw);
	});

	it("returns empty meta and full body when closing --- is missing", () => {
		const raw = "---\ndate: 2026-01-01\nno closing fence";
		const { meta, body } = parseFrontmatter(raw);
		expect(meta).toEqual({});
		expect(body).toBe(raw);
	});

	it("handles empty body after frontmatter", () => {
		const raw = `---
type: note
---
`;
		const { meta, body } = parseFrontmatter(raw);
		expect(meta.type).toBe("note");
		expect(body).toBe("");
	});

	it("skips comment lines and empty lines in frontmatter", () => {
		const raw = `---
# comment
date: 2026-01-01

type: note
---

body`;

		const { meta, body } = parseFrontmatter(raw);
		expect(meta.date).toBe("2026-01-01");
		expect(meta.type).toBe("note");
		expect(body).toBe("body");
	});

	it("handles empty inline array", () => {
		const raw = `---
tags: []
---

body`;

		const { meta } = parseFrontmatter(raw);
		expect(meta.tags).toEqual([]);
	});
});

describe("serializeFrontmatter", () => {
	it("serializes string fields", () => {
		const result = serializeFrontmatter({ date: "2026-01-01", type: "note" }, "hello world");
		expect(result).toBe("---\ndate: 2026-01-01\ntype: note\n---\n\nhello world");
	});

	it("serializes array fields", () => {
		const result = serializeFrontmatter({ tags: ["a", "b"] }, "content");
		expect(result).toContain("tags: [a, b]");
	});

	it("skips undefined values", () => {
		const result = serializeFrontmatter({ date: "2026-01-01", project: undefined }, "body");
		expect(result).not.toContain("project");
	});

	it("roundtrips with parseFrontmatter", () => {
		const meta = { date: "2026-02-28T14:30:00Z", type: "compaction", tags: ["auth", "jwt"] };
		const body = "## Goal\nRefactor auth module";
		const serialized = serializeFrontmatter(meta, body);
		const parsed = parseFrontmatter(serialized);
		expect(parsed.meta).toEqual(meta);
		expect(parsed.body).toBe(body);
	});
});
