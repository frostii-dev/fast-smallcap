import { describe, expect, it } from "vitest";
import { convertDocument } from "./document-converter";
import type { ProtectionConfig } from "./protection-config";
import { DEFAULT_PROTECTION_CONFIG } from "./protection-config";

const TEXTUAL_ONLY = { textualOnly: true };
const ALL_VALUES = { textualOnly: false };

// Config with emoji removal disabled, for tests that contain emojis in expected output.
const NO_EMOJI_REMOVAL: ProtectionConfig = {
	...DEFAULT_PROTECTION_CONFIG,
	removeEmoji: false,
	removeEmojiLeftSpace: false,
	removeEmojiRightSpace: false,
};

describe("yaml documents", () => {
	it("converts only string values, never keys or non-string types", () => {
		const input = `display-name: "Hello World"
description: Welcome Player!
max-players: 100
enabled: true
spawn-location: null
price: 12.5
`;
		const expected = `display-name: "ʜᴇʟʟᴏ ᴡᴏʀʟᴅ"
description: ᴡᴇʟᴄᴏᴍᴇ ᴘʟᴀʏᴇʀ!
max-players: 100
enabled: true
spawn-location: null
price: 12.5
`;
		expect(convertDocument(input, "yaml", TEXTUAL_ONLY)).toEqual({
			output: expected,
			error: null,
		});
	});

	it("never converts mapping keys, even quoted, nested or date-like", () => {
		const input = `"quoted-key": plainvalue
outer:
  "nested-key": "nested value"
2023-01-01: datemarker
`;
		const expected = `"quoted-key": ᴘʟᴀɪɴᴠᴀʟᴜᴇ
outer:
  "nested-key": "ɴᴇꜱᴛᴇᴅ ᴠᴀʟᴜᴇ"
2023-01-01: ᴅᴀᴛᴇᴍᴀʀᴋᴇʀ
`;
		expect(convertDocument(input, "yaml", TEXTUAL_ONLY).output).toBe(expected);
	});

	it("never converts comments, leading or trailing", () => {
		const input = `# heading comment stays
name: Value # trailing comment stays
# another # comment line
enabled: true
`;
		const expected = `# heading comment stays
name: ᴠᴀʟᴜᴇ # trailing comment stays
# another # comment line
enabled: true
`;
		expect(convertDocument(input, "yaml", TEXTUAL_ONLY).output).toBe(expected);
	});

	it("preserves anchors, aliases and merge keys", () => {
		const input = `defaults: &defaults
  title: "&aShared"
item:
  <<: *defaults
ref: *defaults
`;
		const expected = `defaults: &defaults
  title: "&aꜱʜᴀʀᴇᴅ"
item:
  <<: *defaults
ref: *defaults
`;
		expect(convertDocument(input, "yaml", TEXTUAL_ONLY).output).toBe(expected);
	});

	it("converts block scalar content but not the header or keys", () => {
		const input = `motd: |
  Welcome &b{player}
  Enjoy!
folded: >-
  Folded text here
list: ok
`;
		const expected = `motd: |
  ᴡᴇʟᴄᴏᴍᴇ &b{player}
  ᴇɴᴊᴏʏ!
folded: >-
  ꜰᴏʟᴅᴇᴅ ᴛᴇxᴛ ʜᴇʀᴇ
list: ᴏᴋ
`;
		expect(convertDocument(input, "yaml", TEXTUAL_ONLY).output).toBe(expected);
	});

	it("converts flow string values and skips typed entries", () => {
		const input = `tags: [Survival, 100, true, "Tags"]
weights: {name: Alpha, price: 2.5, skip: null}
`;
		const expected = `tags: [ꜱᴜʀᴠɪᴠᴀʟ, 100, true, "ᴛᴀɢꜱ"]
weights: {name: ᴀʟᴘʜᴀ, price: 2.5, skip: null}
`;
		expect(convertDocument(input, "yaml", TEXTUAL_ONLY).output).toBe(expected);
	});

	it("protects placeholders, formatting codes and hex inside values", () => {
		const input = `line: "&a{player} &7#ff0055 visible <tag> ok"
plain: score {amount} #aabbcc
`;
		const expected = `line: "&a{player} &7#ff0055 ᴠɪꜱɪʙʟᴇ <tag> ᴏᴋ"
plain: ꜱᴄᴏʀᴇ {amount} #aabbcc
`;
		expect(convertDocument(input, "yaml", TEXTUAL_ONLY).output).toBe(expected);
	});

	it("reports a clear error and leaves output empty for invalid YAML", () => {
		const result = convertDocument(
			"a: [unclosed\n  b: broken: [",
			"yaml",
			TEXTUAL_ONLY
		);
		expect(result.error).toBeTruthy();
		expect(result.output).toBe("");
	});

	it("converts unicode-mapped letters within accented words", () => {
		const input = `emoji: "🎉 \\"done\\""
text: élégant
`;
		// é is not mapped, but the adjacent Latin letters still convert.
		// Emoji removal is disabled so the 🎉 is preserved for this test.
		expect(
			convertDocument(input, "yaml", {
				...TEXTUAL_ONLY,
				protectionConfig: NO_EMOJI_REMOVAL,
			}).output
		).toBe(
			`emoji: "🎉 \\"ᴅᴏɴᴇ\\""
text: éʟéɢᴀɴᴛ
`
		);
	});
});

describe("json documents", () => {
	it("converts only string values and keeps all formatting", () => {
		const input = `{
  "displayName": "Hello World",
  "maxPlayers": 100,
  "enabled": true,
  "metadata": {
    "description": "Welcome Player!"
  },
  "tags": ["Survival", "Adventure", "Economy"]
}`;
		const expected = `{
  "displayName": "ʜᴇʟʟᴏ ᴡᴏʀʟᴅ",
  "maxPlayers": 100,
  "enabled": true,
  "metadata": {
    "description": "ᴡᴇʟᴄᴏᴍᴇ ᴘʟᴀʏᴇʀ!"
  },
  "tags": ["ꜱᴜʀᴠɪᴠᴀʟ", "ᴀᴅᴠᴇɴᴛᴜʀᴇ", "ᴇᴄᴏɴᴏᴍʏ"]
}`;
		expect(convertDocument(input, "json", TEXTUAL_ONLY)).toEqual({
			output: expected,
			error: null,
		});
	});

	it("never converts object property names", () => {
		const input = `{"Inner Label": {"Inner Label": "value text"}}`;
		expect(convertDocument(input, "json", TEXTUAL_ONLY).output).toBe(
			`{"Inner Label": {"Inner Label": "ᴠᴀʟᴜᴇ ᴛᴇxᴛ"}}`
		);
	});

	it("protects placeholders, codes, hex and escape sequences in values", () => {
		const input = `{
  "note": "&a{player} \\"quoted\\" #ff8844 <tag> text",
  "path": "line1\\nline2"
}`;
		const expected = `{
  "note": "&a{player} \\"ǫᴜᴏᴛᴇᴅ\\" #ff8844 <tag> ᴛᴇxᴛ",
  "path": "ʟɪɴᴇ1\\nʟɪɴᴇ2"
}`;
		expect(convertDocument(input, "json", TEXTUAL_ONLY).output).toBe(expected);
	});

	it("reports a clear error and leaves output empty for invalid JSON", () => {
		const result = convertDocument('{"a": 1,', "json", TEXTUAL_ONLY);
		expect(result.error).toBeTruthy();
		expect(result.output).toBe("");
	});
});

describe("properties documents", () => {
	it("skips textual-literal values by default (textualOnly option)", () => {
		const input = `server-name=My Minecraft Server
server.max-players=100
server.enabled=true
server.description=Welcome Player!
`;
		const expected = `server-name=ᴍʏ ᴍɪɴᴇᴄʀᴀꜰᴛ ꜱᴇʀᴠᴇʀ
server.max-players=100
server.enabled=true
server.description=ᴡᴇʟᴄᴏᴍᴇ ᴘʟᴀʏᴇʀ!
`;
		expect(convertDocument(input, "properties", TEXTUAL_ONLY)).toEqual({
			output: expected,
			error: null,
		});
	});

	it("converts numeric/boolean/null values when textualOnly is disabled", () => {
		const input = `server-name=My Minecraft Server
server.max-players=100
server.enabled=true
spawn=null
`;
		const expected = `server-name=ᴍʏ ᴍɪɴᴇᴄʀᴀꜰᴛ ꜱᴇʀᴠᴇʀ
server.max-players=100
server.enabled=ᴛʀᴜᴇ
spawn=ɴᴜʟʟ
`;
		expect(convertDocument(input, "properties", ALL_VALUES).output).toBe(
			expected
		);
	});

	it("preserves every separator kind and whitespace around it", () => {
		const input = `name : colon spaced
sepcolon:mapped
ws only value
`;
		const expected = `name : ᴄᴏʟᴏɴ ꜱᴘᴀᴄᴇᴅ
sepcolon:ᴍᴀᴘᴘᴇᴅ
ws ᴏɴʟʏ ᴠᴀʟᴜᴇ
`;
		expect(convertDocument(input, "properties", TEXTUAL_ONLY).output).toBe(
			expected
		);
	});

	it("never converts comments or keys", () => {
		const input = `# comment about stuff
! another comment
key=Value here
barekey nobreaks
`;
		const expected = `# comment about stuff
! another comment
key=ᴠᴀʟᴜᴇ ʜᴇʀᴇ
barekey ɴᴏʙʀᴇᴀᴋꜱ
`;
		expect(convertDocument(input, "properties", TEXTUAL_ONLY).output).toBe(
			expected
		);
	});

	it("handles escaped separators in keys", () => {
		const input = `a\\:b=value two
c\\=d=  spaced value
e\\=f: third value
`;
		const expected = `a\\:b=ᴠᴀʟᴜᴇ ᴛᴡᴏ
c\\=d=  ꜱᴘᴀᴄᴇᴅ ᴠᴀʟᴜᴇ
e\\=f: ᴛʜɪʀᴅ ᴠᴀʟᴜᴇ
`;
		expect(convertDocument(input, "properties", TEXTUAL_ONLY).output).toBe(
			expected
		);
	});

	it("supports multiline continuation syntax", () => {
		const input = `message=This is \\
a long value
key2=100
`;
		const expected = `message=ᴛʜɪꜱ ɪꜱ \\
ᴀ ʟᴏɴɢ ᴠᴀʟᴜᴇ
key2=100
`;
		expect(convertDocument(input, "properties", TEXTUAL_ONLY).output).toBe(
			expected
		);
	});

	it("protects placeholders, codes and hex inside values", () => {
		const input = `motd=&bWelcome {player}! &#ff00aa done
`;
		const expected = `motd=&bᴡᴇʟᴄᴏᴍᴇ {player}! &#ff00aa ᴅᴏɴᴇ
`;
		expect(convertDocument(input, "properties", TEXTUAL_ONLY).output).toBe(
			expected
		);
	});
});
