import { describe, expect, it } from "vitest";
import { convertToSmallCaps } from "./converter";
import type { ProtectionConfig } from "./protection-config";
import { DEFAULT_PROTECTION_CONFIG } from "./protection-config";

// Config with emoji removal disabled
const NO_EMOJI: ProtectionConfig = {
	...DEFAULT_PROTECTION_CONFIG,
	removeEmoji: false,
	removeEmojiLeftSpace: false,
	removeEmojiRightSpace: false,
};

// Config with emoji removal enabled but no whitespace removal
const EMOJI_ONLY: ProtectionConfig = {
	...DEFAULT_PROTECTION_CONFIG,
	removeEmoji: true,
	removeEmojiLeftSpace: false,
	removeEmojiRightSpace: false,
};

// Config with emoji removal + left space only
const EMOJI_LEFT: ProtectionConfig = {
	...DEFAULT_PROTECTION_CONFIG,
	removeEmoji: true,
	removeEmojiLeftSpace: true,
	removeEmojiRightSpace: false,
};

// Config with emoji removal + right space only
const EMOJI_RIGHT: ProtectionConfig = {
	...DEFAULT_PROTECTION_CONFIG,
	removeEmoji: true,
	removeEmojiLeftSpace: false,
	removeEmojiRightSpace: true,
};

// Config with emoji removal + both spaces (= DEFAULT)
const EMOJI_BOTH: ProtectionConfig = DEFAULT_PROTECTION_CONFIG;

describe("emoji removal - basic", () => {
	it("removes emoji and both spaces by default", () => {
		// DEFAULT removes left + right space
		expect(convertToSmallCaps("Hello 😀 World", EMOJI_BOTH)).toBe("ʜᴇʟʟᴏᴡᴏʀʟᴅ");
	});

	it("preserves emoji when disabled", () => {
		expect(convertToSmallCaps("Hello 😀 World", NO_EMOJI)).toBe(
			"ʜᴇʟʟᴏ 😀 ᴡᴏʀʟᴅ"
		);
	});

	it("removes emoji but keeps both spaces when only emoji removal is on", () => {
		expect(convertToSmallCaps("Hello 😀 World", EMOJI_ONLY)).toBe(
			"ʜᴇʟʟᴏ  ᴡᴏʀʟᴅ"
		);
	});

	it("removes emoji and left space only (right space kept)", () => {
		// "Hello 😀 World" → remove 😀 + left space → "Hello" + " World"
		expect(convertToSmallCaps("Hello 😀 World", EMOJI_LEFT)).toBe(
			"ʜᴇʟʟᴏ ᴡᴏʀʟᴅ"
		);
	});

	it("removes emoji and right space only (left space kept)", () => {
		// "Hello 😀 World" → remove 😀 + right space → "Hello " + "World"
		expect(convertToSmallCaps("Hello 😀 World", EMOJI_RIGHT)).toBe(
			"ʜᴇʟʟᴏ ᴡᴏʀʟᴅ"
		);
	});

	it("removes emoji and both spaces (default config)", () => {
		expect(convertToSmallCaps("Hello 😀 World")).toBe("ʜᴇʟʟᴏᴡᴏʀʟᴅ");
	});
});

describe("emoji removal - string boundaries", () => {
	it("removes emoji at start of string (both spaces)", () => {
		expect(convertToSmallCaps("😀 Hello", EMOJI_BOTH)).toBe("ʜᴇʟʟᴏ");
	});

	it("removes emoji at end of string (both spaces)", () => {
		expect(convertToSmallCaps("Hello 😀", EMOJI_BOTH)).toBe("ʜᴇʟʟᴏ");
	});

	it("emoji at start with left space: no space before, so nothing extra removed", () => {
		// 😀 at position 0, no char before → left space removal does nothing
		// right space IS removed (EMOJI_LEFT has right=false, so space stays)
		expect(convertToSmallCaps("😀 Hello", EMOJI_LEFT)).toBe(" ʜᴇʟʟᴏ");
	});

	it("emoji at start with right space: space after emoji removed", () => {
		expect(convertToSmallCaps("😀 Hello", EMOJI_RIGHT)).toBe("ʜᴇʟʟᴏ");
	});

	it("emoji at end with left space: space before emoji removed", () => {
		expect(convertToSmallCaps("Hello 😀", EMOJI_LEFT)).toBe("ʜᴇʟʟᴏ");
	});

	it("emoji at end with right space: no char after → nothing extra removed", () => {
		expect(convertToSmallCaps("Hello 😀", EMOJI_RIGHT)).toBe("ʜᴇʟʟᴏ ");
	});

	it("string with only an emoji", () => {
		expect(convertToSmallCaps("😀", EMOJI_BOTH)).toBe("");
		expect(convertToSmallCaps(" 😀 ", EMOJI_BOTH)).toBe("");
	});
});

describe("emoji removal - consecutive emojis", () => {
	it("removes consecutive emojis", () => {
		expect(convertToSmallCaps("😀😁😂", EMOJI_BOTH)).toBe("");
	});

	it("removes consecutive emojis with spaces between (emoji only)", () => {
		// 😀 😁 😂 → 2 spaces between 3 emojis, emojis removed → "  " (2 spaces)
		expect(convertToSmallCaps("😀 😁 😂", EMOJI_ONLY)).toBe("  ");
	});

	it("removes emoji + text + emoji", () => {
		expect(convertToSmallCaps("😀 Hello 😁", EMOJI_BOTH)).toBe("ʜᴇʟʟᴏ");
	});
});

describe("emoji removal - skin tone modifiers", () => {
	it("removes skin-tone emojis (thumbs up with skin tone)", () => {
		// 👍🏽 = U+1F44D U+1F3FD
		expect(convertToSmallCaps("Good 👍🏽 job", EMOJI_BOTH)).toBe("ɢᴏᴏᴅᴊᴏʙ");
	});

	it("removes skin-tone emojis with left space (right space kept)", () => {
		// "Good 👍🏽 job" → remove 👍🏽 + left space → "Good" + " job"
		expect(convertToSmallCaps("Good 👍🏽 job", EMOJI_LEFT)).toBe("ɢᴏᴏᴅ ᴊᴏʙ");
	});

	it("removes skin-tone emojis with right space (left space kept)", () => {
		// "Good 👍🏽 job" → remove 👍🏽 + right space → "Good " + "job"
		expect(convertToSmallCaps("Good 👍🏽 job", EMOJI_RIGHT)).toBe("ɢᴏᴏᴅ ᴊᴏʙ");
	});
});

describe("emoji removal - flags", () => {
	it("removes country flag emojis (regional indicator pairs)", () => {
		// 🇺🇸 = U+1F1FA U+1F1F8
		expect(convertToSmallCaps("USA 🇺🇸", EMOJI_BOTH)).toBe("ᴜꜱᴀ");
	});

	it("removes flag with left space", () => {
		expect(convertToSmallCaps("USA 🇺🇸", EMOJI_LEFT)).toBe("ᴜꜱᴀ");
	});

	it("removes flag with right space", () => {
		// 🇺🇸 at end, no char after → right space removal does nothing extra
		expect(convertToSmallCaps("USA 🇺🇸", EMOJI_RIGHT)).toBe("ᴜꜱᴀ ");
	});
});

describe("emoji removal - keycap emojis", () => {
	it("removes keycap emojis", () => {
		// 1️⃣ = U+0031 U+FE0F U+20E3
		expect(convertToSmallCaps("Step 1️⃣ done", EMOJI_BOTH)).toBe("ꜱᴛᴇᴘᴅᴏɴᴇ");
	});

	it("removes keycap emoji with spaces", () => {
		// "Step 1️⃣ done" → remove 1️⃣ + left space → "Step" + " done"
		expect(convertToSmallCaps("Step 1️⃣ done", EMOJI_LEFT)).toBe("ꜱᴛᴇᴘ ᴅᴏɴᴇ");
	});
});

describe("emoji removal - ZWJ / joined emojis", () => {
	it("removes family emoji (ZWJ sequence)", () => {
		// 👨‍👩‍👧‍👦 = U+1F468 U+200D U+1F469 U+200D U+1F467 U+200D U+1F466
		expect(convertToSmallCaps("Family 👨‍👩‍👧‍👦 home", EMOJI_BOTH)).toBe("ꜰᴀᴍɪʟʏʜᴏᴍᴇ");
	});

	it("removes ZWJ emoji with spaces", () => {
		// "Family 👨‍👩‍👧‍👦 home" → remove ZWJ + left space → "Family" + " home"
		expect(convertToSmallCaps("Family 👨‍👩‍👧‍👦 home", EMOJI_LEFT)).toBe(
			"ꜰᴀᴍɪʟʏ ʜᴏᴍᴇ"
		);
	});
});

describe("emoji removal - punctuation adjacency", () => {
	it("preserves punctuation around removed emoji", () => {
		expect(convertToSmallCaps("Hello, 😀 world!", EMOJI_BOTH)).toBe(
			"ʜᴇʟʟᴏ,ᴡᴏʀʟᴅ!"
		);
	});

	it("preserves punctuation adjacent to emoji (no space)", () => {
		expect(convertToSmallCaps("Hello😀world", EMOJI_BOTH)).toBe("ʜᴇʟʟᴏᴡᴏʀʟᴅ");
		expect(convertToSmallCaps("Hello😀world", EMOJI_ONLY)).toBe("ʜᴇʟʟᴏᴡᴏʀʟᴅ");
	});

	it("does not remove left space when no space before emoji", () => {
		// "Hello😀 World" - no space before 😀, so left space removal does nothing
		// emoji removed, right space kept → "Hello World"
		expect(convertToSmallCaps("Hello😀 World", EMOJI_LEFT)).toBe("ʜᴇʟʟᴏ ᴡᴏʀʟᴅ");
	});

	it("does not remove right space when no space after emoji", () => {
		// "Hello 😀World" - no space after 😀, so right space removal does nothing
		// emoji removed, left space kept → "Hello World"
		expect(convertToSmallCaps("Hello 😀World", EMOJI_RIGHT)).toBe(
			"ʜᴇʟʟᴏ ᴡᴏʀʟᴅ"
		);
	});
});

describe("emoji removal - multiple spaces", () => {
	it("removes only one space to the left (not all)", () => {
		// "Hello  😀 World" → remove 😀 + ONE left space → "Hello " + " World"
		expect(convertToSmallCaps("Hello  😀 World", EMOJI_LEFT)).toBe(
			"ʜᴇʟʟᴏ  ᴡᴏʀʟᴅ"
		);
	});

	it("removes only one space to the right (not all)", () => {
		// "Hello 😀  World" → remove 😀 + ONE right space → "Hello " + " World"
		expect(convertToSmallCaps("Hello 😀  World", EMOJI_RIGHT)).toBe(
			"ʜᴇʟʟᴏ  ᴡᴏʀʟᴅ"
		);
	});
});

describe("emoji removal - tabs and line breaks", () => {
	it("removes tab adjacent to emoji (left)", () => {
		// "Hello\t😀 World" → remove 😀 + tab → "Hello" + " World"
		expect(convertToSmallCaps("Hello\t😀 World", EMOJI_LEFT)).toBe(
			"ʜᴇʟʟᴏ ᴡᴏʀʟᴅ"
		);
	});

	it("removes tab adjacent to emoji (right)", () => {
		// "Hello\t😀 World" → remove 😀 + right space → "Hello\t" + "World"
		expect(convertToSmallCaps("Hello\t😀 World", EMOJI_RIGHT)).toBe(
			"ʜᴇʟʟᴏ\tᴡᴏʀʟᴅ"
		);
	});

	it("removes line break adjacent to emoji when configured (left)", () => {
		// "Hello\n😀 World" → remove 😀 + \n → "Hello" + " World"
		expect(convertToSmallCaps("Hello\n😀 World", EMOJI_LEFT)).toBe(
			"ʜᴇʟʟᴏ ᴡᴏʀʟᴅ"
		);
	});

	it("removes line break adjacent to emoji when configured (right)", () => {
		// "Hello 😀\nWorld" → remove 😀 + \n → "Hello " + "World"
		expect(convertToSmallCaps("Hello 😀\nWorld", EMOJI_RIGHT)).toBe(
			"ʜᴇʟʟᴏ ᴡᴏʀʟᴅ"
		);
	});

	it("preserves line breaks not adjacent to emoji", () => {
		// "Hello\n😀\nWorld" with both spaces: both \n removed
		expect(convertToSmallCaps("Hello\n😀\nWorld", EMOJI_BOTH)).toBe(
			"ʜᴇʟʟᴏᴡᴏʀʟᴅ"
		);
	});
});

describe("emoji removal - interaction with protected patterns", () => {
	it("does not remove emojis inside placeholders", () => {
		// Placeholders are protected spans - content inside is not converted
		expect(convertToSmallCaps("Hello {🎉 player}!", NO_EMOJI)).toBe(
			"ʜᴇʟʟᴏ {🎉 player}!"
		);
		expect(convertToSmallCaps("Hello {🎉 player}!", EMOJI_BOTH)).toBe(
			"ʜᴇʟʟᴏ {🎉 player}!"
		);
	});

	it("does not remove emojis inside Minecraft formatting codes", () => {
		// &a is protected, "🎉 text" after it → emoji removed + right space
		// No space between &a and 🎉 → "&a" + "ᴛᴇxᴛ"
		expect(convertToSmallCaps("&a🎉 text", EMOJI_BOTH)).toBe("&aᴛᴇxᴛ");
		// Space between code and emoji is also removed (left space adjacent to emoji)
		expect(convertToSmallCaps("&a 🎉 text", EMOJI_BOTH)).toBe("&aᴛᴇxᴛ");
	});

	it("does not remove emojis inside hex color codes", () => {
		// #ff00aa protected, " 🎉 done" → emoji removed + right space
		expect(convertToSmallCaps("#ff00aa 🎉 done", EMOJI_BOTH)).toBe(
			"#ff00aaᴅᴏɴᴇ"
		);
	});

	it("does not remove emojis inside unicode escape sequences", () => {
		// \\u00e9 protected, " 🎉 done" → emoji removed + right space
		expect(convertToSmallCaps("\\u00e9 🎉 done", EMOJI_BOTH)).toBe(
			"\\u00e9ᴅᴏɴᴇ"
		);
	});
});

describe("emoji removal - idempotency", () => {
	it("is idempotent: converting twice equals converting once", () => {
		const original = "Hello 😀 World &a{player}";
		const once = convertToSmallCaps(original, EMOJI_BOTH);
		expect(convertToSmallCaps(once, EMOJI_BOTH)).toBe(once);
	});

	it("does not reintroduce removed emojis on second pass", () => {
		const original = "Hello 😀 World";
		const once = convertToSmallCaps(original, EMOJI_BOTH);
		expect(once).not.toContain("😀");
		expect(convertToSmallCaps(once, EMOJI_BOTH)).toBe(once);
	});
});
