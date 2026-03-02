import type { MemoryEntry, SearchResult } from "./types.js";

/** Split text into lowercase tokens on whitespace and common punctuation. */
function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/[\s,.\-:;!?()[\]{}"'`#*_/\\|@&=+<>]+/)
			.filter((t) => t.length > 1),
	);
}

/** Rough token count estimate: ~4 chars per token for mixed CJK/Latin text. */
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

export function search(
	memories: MemoryEntry[],
	query: string,
	options?: { project?: string; topK?: number; maxTokens?: number },
): SearchResult[] {
	const topK = options?.topK ?? 5;
	const maxTokens = options?.maxTokens ?? 4000;
	const project = options?.project;

	if (memories.length === 0 || !query.trim()) return [];

	const queryTokens = tokenize(query);
	if (queryTokens.size === 0) return [];

	const scored: SearchResult[] = [];

	for (const entry of memories) {
		const entryTokens = tokenize(entry.content);
		if (entryTokens.size === 0) continue;

		// Jaccard-like: intersection / queryTokens size
		let intersection = 0;
		for (const token of queryTokens) {
			if (entryTokens.has(token)) intersection++;
		}

		if (intersection === 0) continue;

		let score = intersection / queryTokens.size;

		// Boost if project matches
		if (project && entry.project && entry.project === project) {
			score *= 1.5;
		}

		// Slight recency boost: newer entries get a small bonus
		if (entry.date) {
			const age = Date.now() - new Date(entry.date).getTime();
			const dayMs = 86400000;
			// Max 10% boost for entries from today, decaying over 30 days
			const recencyBoost = Math.max(0, 1 - age / (30 * dayMs)) * 0.1;
			score += recencyBoost;
		}

		scored.push({ entry, score });
	}

	// Sort by score descending
	scored.sort((a, b) => b.score - a.score);

	// Take topK while respecting token budget
	const results: SearchResult[] = [];
	let totalTokens = 0;

	for (const item of scored) {
		if (results.length >= topK) break;

		const tokens = estimateTokens(item.entry.content);
		if (totalTokens + tokens > maxTokens && results.length > 0) break;

		results.push(item);
		totalTokens += tokens;
	}

	return results;
}
