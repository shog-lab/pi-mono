import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseFrontmatter } from "../src/frontmatter.js";
import { deleteMemory, getDefaultConfig, loadAllMemories, saveMemory } from "../src/store.js";
import type { MemoryConfig } from "../src/types.js";

let testDir: string;
let config: MemoryConfig;

beforeEach(() => {
	testDir = join(tmpdir(), `pi-mem-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(testDir, { recursive: true });
	config = { ...getDefaultConfig(), memoryDir: testDir };
});

afterEach(() => {
	rmSync(testDir, { recursive: true, force: true });
});

describe("saveMemory", () => {
	it("creates a .md file with correct frontmatter", () => {
		const path = saveMemory(config, "note", "remember this", { project: "/test" });
		expect(existsSync(path)).toBe(true);

		const raw = readFileSync(path, "utf-8");
		const { meta, body } = parseFrontmatter(raw);
		expect(meta.type).toBe("note");
		expect(meta.project).toBe("/test");
		expect(meta.date).toBeTruthy();
		expect(body).toBe("remember this");
	});

	it("creates a file with tags", () => {
		const path = saveMemory(config, "compaction", "summary", {
			tags: ["auth", "refactor"],
		});
		const raw = readFileSync(path, "utf-8");
		const { meta } = parseFrontmatter(raw);
		expect(meta.tags).toEqual(["auth", "refactor"]);
	});

	it("creates the memory directory if it does not exist", () => {
		const deepDir = join(testDir, "a", "b", "c");
		const deepConfig = { ...config, memoryDir: deepDir };
		saveMemory(deepConfig, "note", "test", {});
		expect(existsSync(deepDir)).toBe(true);
	});
});

describe("loadAllMemories", () => {
	it("returns empty array when directory does not exist", () => {
		const noDir = { ...config, memoryDir: join(testDir, "nonexistent") };
		expect(loadAllMemories(noDir)).toEqual([]);
	});

	it("loads all saved memories", () => {
		saveMemory(config, "note", "first", {});
		saveMemory(config, "compaction", "second", { project: "/proj" });

		const memories = loadAllMemories(config);
		expect(memories).toHaveLength(2);

		const contents = memories.map((m) => m.content).sort();
		expect(contents).toEqual(["first", "second"]);

		const compaction = memories.find((m) => m.type === "compaction");
		expect(compaction?.content).toBe("second");
		expect(compaction?.project).toBe("/proj");
	});

	it("ignores non-.md files", () => {
		saveMemory(config, "note", "real", {});
		writeFileSync(join(testDir, "ignore.txt"), "not a memory");

		const memories = loadAllMemories(config);
		expect(memories).toHaveLength(1);
	});
});

describe("deleteMemory", () => {
	it("deletes an existing memory", () => {
		const path = saveMemory(config, "note", "to delete", {});
		expect(deleteMemory(config, path)).toBe(true);
		expect(existsSync(path)).toBe(false);
	});

	it("returns false for non-existent file", () => {
		expect(deleteMemory(config, join(testDir, "nope.md"))).toBe(false);
	});

	it("returns false for path outside memory directory", () => {
		expect(deleteMemory(config, "/tmp/outside.md")).toBe(false);
	});
});
