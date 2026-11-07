import { describe, expect, it } from "vitest";
import { convertToSmallCaps } from "./converter";
import { DEFAULT_PROTECTION_CONFIG } from "./protection-config";

const PAIRS: ReadonlyArray<readonly [string, string]> = [
	["a", "ᴀ"],
	["b", "ʙ"],
	["c", "ᴄ"],
	["d", "ᴅ"],
	["e", "ᴇ"],
	["f", "ꜰ"],
	["g", "ɢ"],
	["h", "ʜ"],
	["i", "ɪ"],
	["j", "ᴊ"],
	["k", "ᴋ"],
	["l", "ʟ"],
	["m", "ᴍ"],
	["n", "ɴ"],
	["o", "ᴏ"],
	["p", "ᴘ"],
	["q", "ǫ"],
	["r", "ʀ"],
	["s", "ꜱ"],
	["t", "ᴛ"],
	["u", "ᴜ"],
	["v", "ᴠ"],
	["w", "ᴡ"],
	["x", "x"],
	["y", "ʏ"],
	["z", "ᴢ"],
];

const LEGACY_CODE_CHARS = "0123456789abcdefklmnor";

describe("character mapping", () => {
	it("converts every lowercase Latin letter", () => {
		for (const [source, expected] of PAIRS) {
			expect(convertToSmallCaps(source)).toBe(expected);
		}
	});

	it("converts every uppercase Latin letter", () => {
		for (const [source, expected] of PAIRS) {
			expect(convertToSmallCaps(source.toUpperCase())).toBe(expected);
		}
	});

	it("converts mixed-case words", () => {
		expect(convertToSmallCaps("HeLLo")).toBe("ʜᴇʟʟᴏ");
		expect(convertToSmallCaps("AbCdEfG")).toBe("ᴀʙᴄᴅᴇꜰɢ");
	});

	it("leaves characters outside the mapping untouched", () => {
		expect(convertToSmallCaps("0123456789")).toBe("0123456789");
		expect(convertToSmallCaps("!?:;-_=+.,()[]")).toBe("!?:;-_=+.,()[]");
		expect(convertToSmallCaps("éñçü")).toBe("éñçü");
		// Already-converted small caps are not Latin letters and stay put.
		expect(convertToSmallCaps("ᴀʙᴄ")).toBe("ᴀʙᴄ");
		// Emoji removal is disabled here so this test focuses on character mapping.
		expect(
			convertToSmallCaps("🎉 party", {
				...DEFAULT_PROTECTION_CONFIG,
				removeEmoji: false,
			})
		).toBe("🎉 ᴘᴀʀᴛʏ");
	});

	it("preserves whitespace, tabs and line endings exactly", () => {
		expect(convertToSmallCaps("a\tb\r\nc\rd")).toBe("ᴀ\tʙ\r\nᴄ\rᴅ");
		expect(convertToSmallCaps("  a   \n\n  b  ")).toBe("  ᴀ   \n\n  ʙ  ");
	});
});

describe("placeholder protection", () => {
	it("preserves curly-brace placeholders with delimiters and contents", () => {
		expect(convertToSmallCaps("Hello {player_name}!")).toBe(
			"ʜᴇʟʟᴏ {player_name}!"
		);
		expect(convertToSmallCaps("welcome {PlayerName}")).toBe(
			"ᴡᴇʟᴄᴏᴍᴇ {PlayerName}"
		);
		expect(convertToSmallCaps("x{a}{B}")).toBe("x{a}{B}");
	});

	it("preserves angle-bracket placeholders", () => {
		expect(convertToSmallCaps("<world> spawn")).toBe("<world> ꜱᴘᴀᴡɴ");
		expect(convertToSmallCaps("Join <redacted> now")).toBe(
			"ᴊᴏɪɴ <redacted> ɴᴏᴡ"
		);
	});

	it("preserves percent placeholders", () => {
		expect(convertToSmallCaps("Rank: %player%")).toBe("ʀᴀɴᴋ: %player%");
		expect(convertToSmallCaps("%some.placeholder% %other%")).toBe(
			"%some.placeholder% %other%"
		);
	});

	it("keeps hex colors protected inside placeholders", () => {
		expect(convertToSmallCaps("{color:#ff0000}")).toBe("{color:#ff0000}");
	});

	it("does not fake a placeholder when a brace is never closed", () => {
		expect(convertToSmallCaps("open { brace")).toBe("ᴏᴘᴇɴ { ʙʀᴀᴄᴇ");
		expect(convertToSmallCaps("a > b")).toBe("ᴀ > ʙ");
	});
});

describe("minecraft formatting codes", () => {
	it("preserves every legacy ampersand color and formatting code", () => {
		for (const code of LEGACY_CODE_CHARS) {
			expect(convertToSmallCaps(`&${code}`)).toBe(`&${code}`);
			expect(convertToSmallCaps(`&${code.toUpperCase()}`)).toBe(
				`&${code.toUpperCase()}`
			);
		}
	});

	it("preserves every section-sign color and formatting code", () => {
		for (const code of LEGACY_CODE_CHARS) {
			expect(convertToSmallCaps(`§${code}`)).toBe(`§${code}`);
			expect(convertToSmallCaps(`§${code.toUpperCase()}`)).toBe(
				`§${code.toUpperCase()}`
			);
		}
	});

	it("preserves ampersand hex color codes", () => {
		expect(convertToSmallCaps("&#ff00aa")).toBe("&#ff00aa");
		expect(convertToSmallCaps("&#FF00AA")).toBe("&#FF00AA");
		expect(convertToSmallCaps("&#12abef")).toBe("&#12abef");
	});

	it("preserves section-sign hex color sequences", () => {
		expect(convertToSmallCaps("§x§f§f§0§0§a§a")).toBe("§x§f§f§0§0§a§a");
		expect(convertToSmallCaps("§x§F§F§0§0§A§A")).toBe("§x§F§F§0§0§A§A");
		// A truncated sequence falls back to protecting each code pair.
		expect(convertToSmallCaps("§x§f§f")).toBe("§x§f§f");
	});

	it("does not protect lookalikes that are not formatting codes", () => {
		// g, h, i, j, p, q, t, u, v, w, x, y, z are not Minecraft codes.
		expect(convertToSmallCaps("&gutive")).toBe("&ɢᴜᴛɪᴠᴇ");
	});
});

describe("hexadecimal color protection", () => {
	const HEX = "#12abef";
	const UPPER = "#ABCDEF";

	it("preserves hex colors at the start of a string", () => {
		expect(convertToSmallCaps(`${HEX} start`)).toBe(`${HEX} ꜱᴛᴀʀᴛ`);
	});

	it("preserves hex colors embedded mid-string", () => {
		expect(convertToSmallCaps(`prefix${HEX}suffix`)).toBe(`ᴘʀᴇꜰɪx${HEX}ꜱᴜꜰꜰɪx`);
	});

	it("preserves hex colors at the end of a string", () => {
		expect(convertToSmallCaps(`end ${HEX}`)).toBe(`ᴇɴᴅ ${HEX}`);
	});

	it("preserves uppercase hex colors", () => {
		expect(convertToSmallCaps(`pre${UPPER}post`)).toBe(`ᴘʀᴇ${UPPER}ᴘᴏꜱᴛ`);
		expect(convertToSmallCaps("#000000 #FFFFFF #ff00aa")).toBe(
			"#000000 #FFFFFF #ff00aa"
		);
	});

	it("protects only valid six-digit hex, not ordinary hash text", () => {
		expect(convertToSmallCaps("#heading")).toBe("#ʜᴇᴀᴅɪɴɢ");
		expect(convertToSmallCaps("#nothex")).toBe("#ɴᴏᴛʜᴇx");
		expect(convertToSmallCaps("#abc")).toBe("#ᴀʙᴄ");
		expect(convertToSmallCaps("# comment about stuff")).toBe(
			"# ᴄᴏᴍᴍᴇɴᴛ ᴀʙᴏᴜᴛ ꜱᴛᴜꜰꜰ"
		);
	});

	it("protects exactly six hex digits and leaves the rest", () => {
		expect(convertToSmallCaps("#abc123x")).toBe("#abc123x");
		expect(convertToSmallCaps("#abc1234")).toBe("#abc1234");
		expect(convertToSmallCaps("#123456e")).toBe("#123456ᴇ");
	});
});

describe("escape sequence protection", () => {
	it("preserves backslash escapes such as \\n and \\t", () => {
		expect(convertToSmallCaps("line\\nnext")).toBe("ʟɪɴᴇ\\nɴᴇxᴛ");
		expect(convertToSmallCaps("tab\\tx")).toBe("ᴛᴀʙ\\tx");
		expect(convertToSmallCaps('quote \\" and slash \\\\ done')).toBe(
			'ǫᴜᴏᴛᴇ \\" ᴀɴᴅ ꜱʟᴀꜱʜ \\\\ ᴅᴏɴᴇ'
		);
	});

	it("preserves unicode escape sequences", () => {
		expect(convertToSmallCaps("uni\\u00e9")).toBe("ᴜɴɪ\\u00e9");
		expect(convertToSmallCaps("uni\\u0041")).toBe("ᴜɴɪ\\u0041");
	});

	it("leaves a lone trailing backslash alone", () => {
		expect(convertToSmallCaps("path ends with \\")).toBe("ᴘᴀᴛʜ ᴇɴᴅꜱ ᴡɪᴛʜ \\");
	});
});

describe("mixed content", () => {
	it("converts only unprotected letters in a mixed string", () => {
		expect(convertToSmallCaps("Text &a{item} done")).toBe("ᴛᴇxᴛ &a{item} ᴅᴏɴᴇ");
		expect(
			convertToSmallCaps("&a{item} &#00ff88 #10ff20 <rank> 100% ᴀʟʟ ꜱᴀꜰᴇ")
		).toBe("&a{item} &#00ff88 #10ff20 <rank> 100% ᴀʟʟ ꜱᴀꜰᴇ");
		expect(convertToSmallCaps("Name:&l{player}&r Score")).toBe(
			"ɴᴀᴍᴇ:&l{player}&r ꜱᴄᴏʀᴇ"
		);
	});

	it("handles adjacent protected patterns", () => {
		expect(convertToSmallCaps("{a}&f#abc123%b%")).toBe("{a}&f#abc123%b%");
	});
});

describe("documents", () => {
	it("converts a realistic YAML document without changing structure", () => {
		const input = `items:
  sword:
    name: "&aIron Sword {rarity}"
    hex: "&#34c759"
`;
		const expected = `ɪᴛᴇᴍꜱ:
  ꜱᴡᴏʀᴅ:
    ɴᴀᴍᴇ: "&aɪʀᴏɴ ꜱᴡᴏʀᴅ {rarity}"
    ʜᴇx: "&#34c759"
`;
		expect(convertToSmallCaps(input)).toBe(expected);
	});

	it("converts a realistic properties document with CRLF endings", () => {
		const input =
			"# Server MOTD\r\nmotd=Hello &b{player}, enjoy!\r\nmax-players=20\r\n";
		const expected =
			"# ꜱᴇʀᴠᴇʀ ᴍᴏᴛᴅ\r\nᴍᴏᴛᴅ=ʜᴇʟʟᴏ &b{player}, ᴇɴᴊᴏʏ!\r\nᴍᴀx-ᴘʟᴀʏᴇʀꜱ=20\r\n";
		expect(convertToSmallCaps(input)).toBe(expected);
	});

	it("converts a realistic JSON document, protecting placeholders and hex", () => {
		const input = `{
  "scoreboard": {
    "title": "&bStats",
    "lines": ["&7Kills: &f{kills}", "&7Rank: &#34c759Legend"]
  }
}`;
		const expected = `{
  "ꜱᴄᴏʀᴇʙᴏᴀʀᴅ": {
    "ᴛɪᴛʟᴇ": "&bꜱᴛᴀᴛꜱ",
    "ʟɪɴᴇꜱ": ["&7Kills: &f{kills}", "&7Rank: &#34c759Legend"]
  }
}`;
		expect(convertToSmallCaps(input)).toBe(expected);
	});

	it("keeps empty input empty", () => {
		expect(convertToSmallCaps("")).toBe("");
	});

	it("is idempotent: converting twice equals converting once", () => {
		const original =
			"&2Top &#ff0000 list {player} <world> #cafebabe \\n plain Text";
		const once = convertToSmallCaps(original);
		expect(convertToSmallCaps(once)).toBe(once);
		// And the second application preserves all protected spans too.
		expect(convertToSmallCaps(once)).toBe(
			convertToSmallCaps(convertToSmallCaps(original))
		);
	});

	it("does not corrupt protected content over repeated conversion", () => {
		let text = "Rank: &a&l{player} &#ff00aa <rank> 100% done";
		for (let i = 0; i < 5; i++) {
			text = convertToSmallCaps(text);
		}
		expect(text).toContain("{player}");
		expect(text).toContain("&a&l");
		expect(text).toContain("&#ff00aa");
		expect(text).toContain("<rank>");
		expect(text).toContain("100%");
	});
});
