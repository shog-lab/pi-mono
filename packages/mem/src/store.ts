import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import type { MemoryConfig, MemoryEntry } from "./types.js";

export function getDefaultConfig(): MemoryConfig {
	return {
		memoryDir: join(homedir(), ".pi", "agent", "memory"),
		maxResults: 5,
		maxInjectTokens: 4000,
	};
}

export function saveMemory(
	config: MemoryConfig,
	type: "compaction" | "note",
	content: string,
	meta: { project?: string; tags?: string[] },
): string {
	mkdirSync(config.memoryDir, { recursive: true });

	const now = new Date();
	const timestamp = now.toISOString().replace(/[:.]/g, "-");
	const hash = createHash("sha256").update(content).digest("hex").slice(0, 8);
	const fileName = `${timestamp}_${hash}.md`;
	const filePath = join(config.memoryDir, fileName);

	const raw = serializeFrontmatter(
		{
			date: now.toISOString(),
			type,
			project: meta.project,
			tags: meta.tags,
		},
		content,
	);

	writeFileSync(filePath, raw, "utf-8");
	return filePath;
}

export function loadAllMemories(config: MemoryConfig): MemoryEntry[] {
	if (!existsSync(config.memoryDir)) return [];

	const files = readdirSync(config.memoryDir)
		.filter((f) => f.endsWith(".md"))
		.sort();
	const entries: MemoryEntry[] = [];

	for (const file of files) {
		const filePath = join(config.memoryDir, file);
		const rawContent = readFileSync(filePath, "utf-8");
		const { meta, body } = parseFrontmatter(rawContent);

		entries.push({
			filePath,
			date: (meta.date as string) || "",
			type: (meta.type as "compaction" | "note") || "note",
			project: meta.project as string | undefined,
			tags: meta.tags as string[] | undefined,
			content: body,
			rawContent,
		});
	}

	return entries;
}

export function deleteMemory(config: MemoryConfig, filePath: string): boolean {
	// Ensure the file is within the memory directory to prevent path traversal
	if (!filePath.startsWith(config.memoryDir)) return false;

	if (existsSync(filePath)) {
		unlinkSync(filePath);
		return true;
	}
	return false;
}
