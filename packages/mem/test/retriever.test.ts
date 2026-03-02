import { describe, expect, it } from "vitest";
import { search } from "../src/retriever.js";
import type { MemoryEntry } from "../src/types.js";

function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
	return {
		filePath: "/test/memory.md",
		date: new Date().toISOString(),
		type: "note",
		content: "",
		rawContent: "",
		...overrides,
	};
}

describe("search", () => {
	it("returns empty for empty memories", () => {
		expect(search([], "test")).toEqual([]);
	});

	it("returns empty for empty query", () => {
		const memories = [makeEntry({ content: "hello world" })];
		expect(search(memories, "")).toEqual([]);
		expect(search(memories, "   ")).toEqual([]);
	});

	it("finds matching memories by keyword", () => {
		const memories = [
			makeEntry({ content: "JWT authentication with refresh tokens" }),
			makeEntry({ content: "Database migration guide for PostgreSQL" }),
			makeEntry({ content: "Auth module uses JWT for session management" }),
		];

		const results = search(memories, "JWT authentication");
		expect(results.length).toBeGreaterThanOrEqual(2);
		// First result should be the one with more keyword overlap
		expect(results[0].entry.content).toContain("JWT");
		expect(results[0].entry.content).toContain("authentication");
	});

	it("boosts project-matching entries", () => {
		const memories = [
			makeEntry({ content: "use pnpm for packages", project: "/other" }),
			makeEntry({ content: "use pnpm for packages", project: "/my-project" }),
		];

		const results = search(memories, "pnpm packages", {
			project: "/my-project",
		});
		expect(results).toHaveLength(2);
		expect(results[0].entry.project).toBe("/my-project");
		expect(results[0].score).toBeGreaterThan(results[1].score);
	});

	it("respects topK limit", () => {
		const memories = Array.from({ length: 10 }, (_, i) =>
			makeEntry({ content: `memory item number ${i} about testing` }),
		);

		const results = search(memories, "testing", { topK: 3 });
		expect(results).toHaveLength(3);
	});

	it("respects maxTokens budget", () => {
		const longContent = "keyword ".repeat(500); // ~4000 chars = ~1000 tokens
		const memories = [
			makeEntry({ content: longContent }),
			makeEntry({ content: longContent }),
			makeEntry({ content: longContent }),
		];

		const results = search(memories, "keyword", { maxTokens: 2000 });
		expect(results.length).toBeLessThanOrEqual(2);
	});

	it("returns no results when no keywords match", () => {
		const memories = [makeEntry({ content: "apples and oranges" }), makeEntry({ content: "bananas and grapes" })];

		const results = search(memories, "JWT authentication");
		expect(results).toHaveLength(0);
	});

	it("scores higher for more keyword overlap", () => {
		const memories = [
			makeEntry({ content: "simple auth" }),
			makeEntry({ content: "auth module with JWT tokens and refresh flow" }),
		];

		const results = search(memories, "auth JWT tokens refresh");
		expect(results[0].entry.content).toContain("JWT");
	});
});
