import type { ProtectionConfig } from "./protection-config";

/**
 * Builds the protected pattern regex from the given configuration.
 * Alternation order matters: at any given start position the most specific
 * pattern must win. Longest/most explicit patterns come first.
 */
export function buildProtectedPattern(config: ProtectionConfig): RegExp {
	const parts: string[] = [];

	// §x§R§R§G§G§B§B — section-sign hex color sequence (most specific)
	if (config.minecraftHexFormatting) {
		parts.push("§x(?:§[0-9a-fA-F]){6}");
	}

	// &#RRGGBB — ampersand hex color code
	if (config.ampHexColors) {
		parts.push("&#[0-9a-fA-F]{6}");
	}

	// #RRGGBB — bare hex color (standalone or embedded)
	if (config.standaloneHexColors || config.embeddedHexColors) {
		parts.push("#[0-9a-fA-F]{6}");
	}

	// \uXXXX — unicode escape sequence
	if (config.unicodeEscapes) {
		parts.push("\\\\u[0-9a-fA-F]{4}");
	}

	// &0-9, &a-f, &k-o, &r — legacy formatting codes (case-insensitive)
	if (config.legacyFormatting) {
		parts.push("[&§][0-9a-fk-or]");
	}

	// \<any char> — generic escape sequences such as \n, \t, \\, \"
	if (config.genericEscapes) {
		parts.push("\\\\.");
	}

	// {placeholder} delimiters and contents, single line only
	if (config.placeholderBraces) {
		parts.push("\\{[^{}\\r\\n]*\\}");
	}

	// <placeholder> delimiters and contents, single line only
	if (config.placeholderAngles) {
		parts.push("<[^<>\\r\\n]*>");
	}

	// %placeholder% delimiters and contents, single line only
	if (config.placeholderPercent) {
		parts.push("%[^%\r\n]*%");
	}

	// [square brackets] — preserve everything inside brackets, single line only
	if (config.squareBrackets) {
		parts.push("\\[[^\\]]*\\]");
	}

	// If no patterns are enabled, match nothing (empty alternation that never matches)
	if (parts.length === 0) {
		return new RegExp("$^", "gi");
	}

	return new RegExp(parts.join("|"), "gi");
}
