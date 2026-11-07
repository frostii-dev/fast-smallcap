import { describe, expect, it } from "vitest";
import { convertToSmallCaps } from "./converter";

/**
 * End-to-end checks against realistic Minecraft plugin configuration
 * content: plugin.yml metadata, EssentialsX-style properties, and a
 * DeluxeChat-style JSON config, exercising every protection rule.
 */
describe("realistic minecraft configuration files", () => {
	it("converts a plugin-style YAML config", () => {
		const input = `# Server shop configuration
shop:
  title: "&2&lMerchant &8» &fWelcome {player}!"
  rows: 3
  items:
    sword:
      slot: 11
      name: "&cFlame Sword"
      lore:
        - "&7Damage: &c+10"
        - "&7Rarity: &#ff5555Legendary"
        - "&8Enchanted #ff00aaEdition"
    potion:
      name: "&aHealing &aPotion <tier> {amount}%"
      color: §x§f§f§5§5§5§5
`;
		const expected = `# ꜱᴇʀᴠᴇʀ ꜱʜᴏᴘ ᴄᴏɴꜰɪɢᴜʀᴀᴛɪᴏɴ
ꜱʜᴏᴘ:
  ᴛɪᴛʟᴇ: "&2&lᴍᴇʀᴄʜᴀɴᴛ &8» &fᴡᴇʟᴄᴏᴍᴇ {player}!"
  ʀᴏᴡꜱ: 3
  ɪᴛᴇᴍꜱ:
    ꜱᴡᴏʀᴅ:
      ꜱʟᴏᴛ: 11
      ɴᴀᴍᴇ: "&cꜰʟᴀᴍᴇ ꜱᴡᴏʀᴅ"
      ʟᴏʀᴇ:
        - "&7ᴅᴀᴍᴀɢᴇ: &c+10"
        - "&7ʀᴀʀɪᴛʏ: &#ff5555ʟᴇɢᴇɴᴅᴀʀʏ"
        - "&8ᴇɴᴄʜᴀɴᴛᴇᴅ #ff00aaᴇᴅɪᴛɪᴏɴ"
    ᴘᴏᴛɪᴏɴ:
      ɴᴀᴍᴇ: "&aʜᴇᴀʟɪɴɢ &aᴘᴏᴛɪᴏɴ <tier> {amount}%"
      ᴄᴏʟᴏʀ: §x§f§f§5§5§5§5
`;
		expect(convertToSmallCaps(input)).toBe(expected);
	});

	it("converts an EssentialsX-style properties file", () => {
		const input = `#EssentialsX config
motd=Welcome to &b&lMine&2Craft&r, {username}!
rules-link=https://mc.example.com/rules?lang=en#top
max-Kills-Percent=100% of reported
colors=&#7f1fd1 and §x§0§f§1§f§d§1 and #abcdef
broken.\\nline=tab\\there
`;
		const expected = `#ᴇꜱꜱᴇɴᴛɪᴀʟꜱx ᴄᴏɴꜰɪɢ
ᴍᴏᴛᴅ=ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ &b&lᴍɪɴᴇ&2ᴄʀᴀꜰᴛ&r, {username}!
ʀᴜʟᴇꜱ-ʟɪɴᴋ=ʜᴛᴛᴘꜱ://ᴍᴄ.ᴇxᴀᴍᴘʟᴇ.ᴄᴏᴍ/ʀᴜʟᴇꜱ?ʟᴀɴɢ=ᴇɴ#ᴛᴏᴘ
ᴍᴀx-ᴋɪʟʟꜱ-ᴘᴇʀᴄᴇɴᴛ=100% ᴏꜰ ʀᴇᴘᴏʀᴛᴇᴅ
ᴄᴏʟᴏʀꜱ=&#7f1fd1 ᴀɴᴅ §x§0§f§1§f§d§1 ᴀɴᴅ #abcdef
ʙʀᴏᴋᴇɴ.\\nʟɪɴᴇ=ᴛᴀʙ\\tʜᴇʀᴇ
`;
		expect(convertToSmallCaps(input)).toBe(expected);
	});

	it("converts a JSON chat config, keeping hex colors and placeholders", () => {
		const input = `{
  "chat": {
    "format": "&7[{prefix}&7] &f{name}: &f{message}",
    "ranks": {
      "vip": {
        "prefix": "&6[VIP]",
        "color": "#ffaa00"
      },
      "mvp": {
        "prefix": "&#55fF55[MVP]",
        "color": "#abcdef"
      }
    },
    "filters": ["[logo]", "%mention%", "<spoiler>"]
  }
}`;
		const expected = `{
  "ᴄʜᴀᴛ": {
    "ꜰᴏʀᴍᴀᴛ": "&7[{prefix}&7] &f{name}: &f{message}",
    "ʀᴀɴᴋꜱ": {
      "ᴠɪᴘ": {
        "ᴘʀᴇꜰɪx": "&6[VIP]",
        "ᴄᴏʟᴏʀ": "#ffaa00"
      },
      "ᴍᴠᴘ": {
        "ᴘʀᴇꜰɪx": "&#55fF55[MVP]",
        "ᴄᴏʟᴏʀ": "#abcdef"
      }
    },
    "ꜰɪʟᴛᴇʀꜱ": ["[logo]", "%mention%", "<spoiler>"]
  }
}`;
		expect(convertToSmallCaps(input)).toBe(expected);
	});

	it("keeps repeated conversion of realistic configs stable", () => {
		const config = `items:
  - name: "&aItem {id} #0f0f0f"
`;
		const once = convertToSmallCaps(config);
		expect(convertToSmallCaps(once)).toBe(once);
	});
});
