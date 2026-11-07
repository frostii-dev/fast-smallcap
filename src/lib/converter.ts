import { buildProtectedPattern } from "./protected-patterns";
import type { ProtectionConfig } from "./protection-config";
import { DEFAULT_PROTECTION_CONFIG } from "./protection-config";
import emojiRegex from "emoji-regex";

/**
 * Latin letter → Unicode small capital. Both cases map to the same glyph.
 */
const SMALL_CAPS: Readonly<Record<string, string | undefined>> = {
	a: "ᴀ",
	b: "ʙ",
	c: "ᴄ",
	d: "ᴅ",
	e: "ᴇ",
	f: "ꜰ",
	g: "ɢ",
	h: "ʜ",
	i: "ɪ",
	j: "ᴊ",
	k: "ᴋ",
	l: "ʟ",
	m: "ᴍ",
	n: "ɴ",
	o: "ᴏ",
	p: "ᴘ",
	q: "ǫ",
	r: "ʀ",
	s: "ꜱ",
	t: "ᴛ",
	u: "ᴜ",
	v: "ᴠ",
	w: "ᴡ",
	x: "x",
	y: "ʏ",
	z: "ᴢ",
};

function convertUnprotectedSegment(segment: string): string {
	let result = "";
	for (const char of segment) {
		const mapped =
			char.length === 1 ? SMALL_CAPS[char.toLowerCase()] : undefined;
		result += mapped ?? char;
	}
	return result;
}

/**
 * Removes emoji characters from an unprotected text segment, optionally
 * removing whitespace immediately to the left and/or right of each removed
 * emoji.
 *
 * Only removes emojis when `config.removeEmoji` is enabled. Adjacent
 * whitespace removal is controlled independently by
 * `config.removeEmojiLeftSpace` and `config.removeEmojiRightSpace`.
 *
 * Uses the `emoji-regex` library for reliable Unicode-aware emoji detection
 * (supports supplementary-plane emojis, skin-tone modifiers, flags,
 * keycap emojis, and ZWJ sequences).
 */
function removeEmojisFromSegment(
	segment: string,
	config: ProtectionConfig
): string {
	if (!config.removeEmoji || segment.length === 0) {
		return segment;
	}

	const regex = emojiRegex();
	regex.lastIndex = 0;

	let result = "";
	let lastIndex = 0;

	for (const match of segment.matchAll(regex)) {
		const start = match.index!;
		const end = start + match[0].length;

		// Determine the actual start: include left whitespace if configured
		let actualStart = start;
		if (
			config.removeEmojiLeftSpace &&
			start > 0 &&
			/\s/.test(segment[start - 1])
		) {
			actualStart = start - 1;
		}

		// Determine the actual end: include right whitespace if configured
		let actualEnd = end;
		if (
			config.removeEmojiRightSpace &&
			end < segment.length &&
			/\s/.test(segment[end])
		) {
			actualEnd = end + 1;
		}

		// Copy everything before this emoji (up to actualStart)
		result += segment.slice(lastIndex, actualStart);
		lastIndex = actualEnd;
	}

	// Copy any remaining text after the last emoji
	result += segment.slice(lastIndex);
	return result;
}

/**
 * Converts Latin letters to Unicode small capitals while preserving protected spans.
 *
 * Processing order:
 *  1. Find all protected spans using the protection pattern
 *  2. Remove emojis (with optional adjacent whitespace) from unprotected segments only
 *  3. Convert small caps on emoji-cleaned unprotected segments
 *  4. Reassemble with protected spans intact
 *
 * @param text - The text to convert
 * @param config - Optional protection config. Defaults to all protections enabled.
 */
export function convertToSmallCaps(
	text: string,
	config: ProtectionConfig = DEFAULT_PROTECTION_CONFIG
): string {
	if (text.length === 0) {
		return text;
	}

	const pattern = buildProtectedPattern(config);
	let result = "";
	let lastEnd = 0;

	for (const match of text.matchAll(pattern)) {
		const start = match.index;

		// Process the unprotected segment before this protected match
		const unprotectedSegment = text.slice(lastEnd, start);
		const emojiCleaned = removeEmojisFromSegment(unprotectedSegment, config);
		result += convertUnprotectedSegment(emojiCleaned);

		// Keep the protected match as-is
		result += match[0];
		lastEnd = start + match[0].length;
	}

	// Process the final unprotected segment after the last protected match
	const finalSegment = text.slice(lastEnd);
	const emojiCleanedFinal = removeEmojisFromSegment(finalSegment, config);
	result += convertUnprotectedSegment(emojiCleanedFinal);

	return result;
}
