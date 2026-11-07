import { describe, expect, it } from "vitest";
import { convertToSmallCaps } from "@/lib/converter";
import type { ProtectionConfig } from "@/lib/protection-config";
import { DEFAULT_PROTECTION_CONFIG } from "@/lib/protection-config";

// Config simulating Auto Convert DISABLED (manual mode)
const MANUAL_MODE: ProtectionConfig = {
	...DEFAULT_PROTECTION_CONFIG,
	removeEmoji: false,
	removeEmojiLeftSpace: false,
	removeEmojiRightSpace: false,
	squareBrackets: false,
};

// Config simulating Auto Convert ENABLED (automatic mode)
const AUTO_MODE: ProtectionConfig = DEFAULT_PROTECTION_CONFIG;

describe("auto convert mode - conversion engine unchanged", () => {
	it("automatic mode converts all string values", () => {
		expect(convertToSmallCaps("Hello World", AUTO_MODE)).toBe("ʜᴇʟʟᴏ ᴡᴏʀʟᴅ");
	});

	it("manual mode uses the same conversion engine", () => {
		expect(convertToSmallCaps("Hello World", MANUAL_MODE)).toBe("ʜᴇʟʟᴏ ᴡᴏʀʟᴅ");
	});

	it("both modes respect square bracket protection when enabled", () => {
		expect(convertToSmallCaps("Hello [Player] World", AUTO_MODE)).toBe(
			"ʜᴇʟʟᴏ [Player] ᴡᴏʀʟᴅ"
		);
		// MANUAL_MODE: squareBrackets disabled → content inside brackets converts
		expect(convertToSmallCaps("Hello [Player] World", MANUAL_MODE)).toBe(
			"ʜᴇʟʟᴏ [ᴘʟᴀʏᴇʀ] ᴡᴏʀʟᴅ"
		);
	});

	it("both modes convert bracketed text when square brackets disabled", () => {
		const noBrackets: ProtectionConfig = {
			...DEFAULT_PROTECTION_CONFIG,
			squareBrackets: false,
		};
		expect(convertToSmallCaps("Hello [Player] World", noBrackets)).toBe(
			"ʜᴇʟʟᴏ [ᴘʟᴀʏᴇʀ] ᴡᴏʀʟᴅ"
		);
	});

	it("both modes respect emoji protection settings", () => {
		const noEmojiRemoval: ProtectionConfig = {
			...DEFAULT_PROTECTION_CONFIG,
			removeEmoji: false,
			removeEmojiLeftSpace: false,
			removeEmojiRightSpace: false,
		};
		expect(convertToSmallCaps("Hello 😀 World", noEmojiRemoval)).toBe(
			"ʜᴇʟʟᴏ 😀 ᴡᴏʀʟᴅ"
		);
		expect(
			convertToSmallCaps("Hello 😀 World", DEFAULT_PROTECTION_CONFIG)
		).toBe("ʜᴇʟʟᴏᴡᴏʀʟᴅ");
	});

	it("both modes respect placeholder protection", () => {
		expect(convertToSmallCaps("Hello {player} World", AUTO_MODE)).toBe(
			"ʜᴇʟʟᴏ {player} ᴡᴏʀʟᴅ"
		);
		expect(convertToSmallCaps("Hello {player} World", MANUAL_MODE)).toBe(
			"ʜᴇʟʟᴏ {player} ᴡᴏʀʟᴅ"
		);
	});

	it("both modes respect Minecraft formatting codes", () => {
		expect(convertToSmallCaps("&aHello &bWorld", AUTO_MODE)).toBe(
			"&aʜᴇʟʟᴏ &bᴡᴏʀʟᴅ"
		);
		expect(convertToSmallCaps("&aHello &bWorld", MANUAL_MODE)).toBe(
			"&aʜᴇʟʟᴏ &bᴡᴏʀʟᴅ"
		);
	});

	it("both modes respect hex color codes", () => {
		expect(convertToSmallCaps("#ff00aa text", AUTO_MODE)).toBe("#ff00aa ᴛᴇxᴛ");
		expect(convertToSmallCaps("#ff00aa text", MANUAL_MODE)).toBe(
			"#ff00aa ᴛᴇxᴛ"
		);
	});

	it("both modes are idempotent", () => {
		const original = "Hello [Player] World &a{item}";
		const once = convertToSmallCaps(original, AUTO_MODE);
		expect(convertToSmallCaps(once, AUTO_MODE)).toBe(once);

		const onceManual = convertToSmallCaps(original, MANUAL_MODE);
		expect(convertToSmallCaps(onceManual, MANUAL_MODE)).toBe(onceManual);
	});
});

describe("auto convert mode - empty content", () => {
	it("handles empty content in both modes", () => {
		expect(convertToSmallCaps("", AUTO_MODE)).toBe("");
		expect(convertToSmallCaps("", MANUAL_MODE)).toBe("");
	});
});
