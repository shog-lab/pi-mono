export interface MemoryEntry {
	filePath: string;
	date: string;
	type: "compaction" | "note";
	project?: string;
	tags?: string[];
	content: string;
	rawContent: string;
}

export interface MemoryConfig {
	memoryDir: string;
	maxResults: number;
	maxInjectTokens: number;
}

export interface SearchResult {
	entry: MemoryEntry;
	score: number;
}
