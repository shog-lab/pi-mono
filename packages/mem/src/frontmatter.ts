/**
 * Minimal YAML frontmatter parser/serializer.
 * Supports string and string[] values only — no external dependencies.
 */

export interface Frontmatter {
	[key: string]: string | string[] | undefined;
}

/**
 * Parse a markdown file with YAML frontmatter.
 * Returns the parsed frontmatter fields and the body after the closing `---`.
 */
export function parseFrontmatter(raw: string): { meta: Frontmatter; body: string } {
	const meta: Frontmatter = {};

	if (!raw.startsWith("---")) {
		return { meta, body: raw };
	}

	const endIdx = raw.indexOf("\n---", 3);
	if (endIdx === -1) {
		return { meta, body: raw };
	}

	const yamlBlock = raw.slice(4, endIdx); // skip leading "---\n"
	const body = raw.slice(endIdx + 4).replace(/^\n+/, ""); // skip closing "---" and blank lines

	for (const line of yamlBlock.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const colonIdx = trimmed.indexOf(":");
		if (colonIdx === -1) continue;

		const key = trimmed.slice(0, colonIdx).trim();
		const rawValue = trimmed.slice(colonIdx + 1).trim();

		if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
			// Inline array: [a, b, c]
			const inner = rawValue.slice(1, -1);
			meta[key] = inner
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} else {
			meta[key] = rawValue;
		}
	}

	return { meta, body };
}

/**
 * Serialize frontmatter fields and body into a markdown string with YAML header.
 */
export function serializeFrontmatter(meta: Frontmatter, body: string): string {
	const lines: string[] = ["---"];

	for (const [key, value] of Object.entries(meta)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			lines.push(`${key}: [${value.join(", ")}]`);
		} else {
			lines.push(`${key}: ${value}`);
		}
	}

	lines.push("---");
	lines.push("");
	lines.push(body);

	return lines.join("\n");
}
