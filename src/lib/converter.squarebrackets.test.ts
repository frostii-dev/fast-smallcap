import { describe, expect, it } from "vitest";
import { convertToSmallCaps } from "./converter";
import type { ProtectionConfig } from "./protection-config";
import { DEFAULT_PROTECTION_CONFIG } from "./protection-config";

// Config with square brackets disabled
const NO_BRACKETS: ProtectionConfig = {
	...DEFAULT_PROTECTION_CONFIG,
	squareBrackets: false,
};

// Config with square brackets enabled (= DEFAULT)
const WITH_BRACKETS: ProtectionConfig = DEFAULT_PROTECTION_CONFIG;

describe("square bracket protection - basic", () => {
	it("protects single bracketed expression by default", () => {
		expect(convertToSmallCaps("Hello [PlayerName] World", WITH_BRACKETS)).toBe(
			"ʜᴇʟʟᴏ [PlayerName] ᴡᴏʀʟᴅ"
		);
	});

	it("converts bracketed text when rule disabled", () => {
		// Brackets are not letters, so they pass through. Content inside is converted.
		expect(convertToSmallCaps("Hello [PlayerName] World", NO_BRACKETS)).toBe(
			"ʜᴇʟʟᴏ [ᴘʟᴀʏᴇʀɴᴀᴍᴇ] ᴡᴏʀʟᴅ"
		);
	});

	it("protects multiple bracketed expressions", () => {
		expect(
			convertToSmallCaps("[PlayerName] and [Server_Name]", WITH_BRACKETS)
		).toBe("[PlayerName] ᴀɴᴅ [Server_Name]");
	});

	it("protects adjacent bracketed expressions", () => {
		expect(convertToSmallCaps("[a][b]", WITH_BRACKETS)).toBe("[a][b]");
	});

	it("protects empty brackets", () => {
		expect(convertToSmallCaps("Hello [] World", WITH_BRACKETS)).toBe(
			"ʜᴇʟʟᴏ [] ᴡᴏʀʟᴅ"
		);
	});
});

describe("square bracket protection - content types", () => {
	it("protects spaces inside brackets", () => {
		expect(convertToSmallCaps("[Hello World]", WITH_BRACKETS)).toBe(
			"[Hello World]"
		);
	});

	it("protects numbers and underscores inside brackets", () => {
		expect(convertToSmallCaps("[player_123]", WITH_BRACKETS)).toBe(
			"[player_123]"
		);
	});

	it("protects unicode inside brackets", () => {
		expect(convertToSmallCaps("[Player_ñ]", WITH_BRACKETS)).toBe("[Player_ñ]");
	});

	it("protects punctuation inside brackets", () => {
		expect(convertToSmallCaps("[Hello, World!]", WITH_BRACKETS)).toBe(
			"[Hello, World!]"
		);
	});
});

describe("square bracket protection - edge cases", () => {
	it("handles unmatched opening bracket safely", () => {
		// No closing ], so no match. [ stays (not a letter), World converts.
		expect(convertToSmallCaps("Hello [World", WITH_BRACKETS)).toBe(
			"ʜᴇʟʟᴏ [ᴡᴏʀʟᴅ"
		);
	});

	it("handles unmatched closing bracket safely", () => {
		// No opening [, so no match. Text is converted.
		expect(convertToSmallCaps("Hello] World", WITH_BRACKETS)).toBe(
			"ʜᴇʟʟᴏ] ᴡᴏʀʟᴅ"
		);
	});

	it("handles nested brackets (matches to first closing bracket)", () => {
		// [a[b]c] -> matches [a[b] (first ]), leaves c] to be converted
		expect(convertToSmallCaps("[a[b]c]", WITH_BRACKETS)).toBe("[a[b]ᴄ]");
	});

	it("handles multiple separate bracket groups", () => {
		expect(
			convertToSmallCaps("[one] two [three] four [five]", WITH_BRACKETS)
		).toBe("[one] ᴛᴡᴏ [three] ꜰᴏᴜʀ [five]");
	});
});

describe("square bracket protection - interaction with other rules", () => {
	it("works alongside placeholder protection", () => {
		expect(convertToSmallCaps("[{player}] and {player}", WITH_BRACKETS)).toBe(
			"[{player}] ᴀɴᴅ {player}"
		);
	});

	it("works alongside Minecraft formatting codes", () => {
		expect(convertToSmallCaps("&a[VIP] &b[Player]", WITH_BRACKETS)).toBe(
			"&a[VIP] &b[Player]"
		);
	});

	it("works alongside hex color codes", () => {
		expect(convertToSmallCaps("#ff00aa [test]", WITH_BRACKETS)).toBe(
			"#ff00aa [test]"
		);
	});

	it("emoji removal around bracketed expressions", () => {
		const emojiConfig: ProtectionConfig = {
			...WITH_BRACKETS,
			removeEmoji: true,
			removeEmojiLeftSpace: true,
			removeEmojiRightSpace: true,
		};
		// "Hello 😀 [Player] World" -> remove 😀 + left+right space
		// "Hello" + "[Player] World" -> "ʜᴇʟʟᴏ[Player] ᴡᴏʀʟᴅ"
		expect(convertToSmallCaps("Hello 😀 [Player] World", emojiConfig)).toBe(
			"ʜᴇʟʟᴏ[Player] ᴡᴏʀʟᴅ"
		);
	});
});

describe("square bracket protection - idempotency", () => {
	it("is idempotent: converting twice equals converting once", () => {
		const original = "Hello [PlayerName] World &a{item}";
		const once = convertToSmallCaps(original, WITH_BRACKETS);
		expect(convertToSmallCaps(once, WITH_BRACKETS)).toBe(once);
	});

	it("does not reintroduce converted text inside brackets on second pass", () => {
		const original = "Hello [PlayerName] World";
		const once = convertToSmallCaps(original, WITH_BRACKETS);
		expect(once).toContain("[PlayerName]");
		expect(convertToSmallCaps(once, WITH_BRACKETS)).toBe(once);
	});
});
