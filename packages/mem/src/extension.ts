import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { search } from "./retriever.js";
import { deleteMemory, getDefaultConfig, loadAllMemories, saveMemory } from "./store.js";
import type { SearchResult } from "./types.js";

function formatMemoriesForPrompt(results: SearchResult[]): string {
	const lines = ["<long-term-memory>"];
	for (const { entry, score } of results) {
		const meta = [`type=${entry.type}`, `date=${entry.date.slice(0, 10)}`];
		if (entry.project) meta.push(`project=${entry.project}`);
		if (entry.tags?.length) meta.push(`tags=${entry.tags.join(",")}`);
		lines.push(`\n### Memory (${meta.join(" | ")} | relevance=${score.toFixed(2)})\n`);
		lines.push(entry.content);
	}
	lines.push("\n</long-term-memory>");
	return lines.join("\n");
}

export default function memExtension(pi: ExtensionAPI) {
	const config = getDefaultConfig();

	// 1. Compaction auto-save
	pi.on("session_compact", (event, ctx) => {
		saveMemory(config, "compaction", event.compactionEntry.summary, {
			project: ctx.cwd,
		});
	});

	// 2. Inject relevant memories before agent starts
	pi.on("before_agent_start", (event, ctx) => {
		const memories = loadAllMemories(config);
		if (memories.length === 0) return;

		const results = search(memories, event.prompt, {
			project: ctx.cwd,
			topK: config.maxResults,
			maxTokens: config.maxInjectTokens,
		});
		if (results.length === 0) return;

		const memoryBlock = formatMemoriesForPrompt(results);
		return {
			systemPrompt: `${event.systemPrompt}\n\n${memoryBlock}`,
		};
	});

	// 3. /remember command
	pi.registerCommand("remember", {
		description: "Save a note to long-term memory",
		handler: async (args, ctx) => {
			if (!args.trim()) {
				ctx.ui.notify("Usage: /remember <content>", "info");
				return;
			}
			saveMemory(config, "note", args.trim(), { project: ctx.cwd });
			ctx.ui.notify("Memory saved.", "info");
		},
	});

	// 4. /forget command
	pi.registerCommand("forget", {
		description: "Delete a memory",
		handler: async (_args, ctx) => {
			const memories = loadAllMemories(config);
			if (memories.length === 0) {
				ctx.ui.notify("No memories found.", "info");
				return;
			}

			const labels = memories.map((m) => `[${m.type}] ${m.date.slice(0, 10)} — ${m.content.slice(0, 60)}...`);
			const choice = await ctx.ui.select("Select memory to forget:", labels);
			if (choice === undefined) return;

			const idx = labels.indexOf(choice);
			if (idx >= 0) {
				deleteMemory(config, memories[idx].filePath);
				ctx.ui.notify("Memory deleted.", "info");
			}
		},
	});

	// 5. /memories command
	pi.registerCommand("memories", {
		description: "List all memories",
		handler: async (_args, ctx) => {
			const memories = loadAllMemories(config);
			if (memories.length === 0) {
				ctx.ui.notify("No memories yet.", "info");
				return;
			}
			const summary = memories
				.map(
					(m) => `- [${m.type}] ${m.date.slice(0, 10)} | ${m.project || "global"} | ${m.content.slice(0, 80)}...`,
				)
				.join("\n");
			ctx.ui.notify(`## Memories (${memories.length})\n\n${summary}`, "info");
		},
	});
}
