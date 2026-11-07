import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import * as fs from "fs";
import {
	uploadFile,
	getOriginalContent,
	getConvertedContent,
	getExpectedOutput,
	clickCopyOutput,
	clickDownload,
	clickClear,
	openConversionRules,
	toggleProtectionRule,
	clickDropdownAction,
	getStatusBarText,
	getEditorLanguage,
	waitForConversion,
	normalizeLineEndings,
	getClipboardText,
	setEditorValue,
	getFontSize,
	getWordWrap,
	getReadOnly,
	getFixtureContent,
} from "./utils";

const FIXTURES = [
	{ name: "config.yaml", format: "yaml" },
	{ name: "config.yml", format: "yml" },
	{ name: "config.json", format: "json" },
	{ name: "config.properties", format: "properties" },
	{ name: "large.properties", format: "properties" },
];

test.describe("Application Startup", () => {
	test("loads successfully and initializes Monaco Editor", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("header")).toContainText("Fast SmallCaps");

		const editors = page.locator(".monaco-editor");
		await expect(editors).toHaveCount(2);

		await expect(page.getByRole("button", { name: "Open File" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Convert" })).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Copy Output" })
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();

		await expect(page.locator("footer")).toContainText("Ready");

		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") errors.push(msg.text());
		});
		await page.waitForTimeout(500);
		expect(errors).toHaveLength(0);
	});
});

test.describe("File Format Testing", () => {
	for (const fixture of FIXTURES) {
		test.describe(`${fixture.format.toUpperCase()} - ${fixture.name}`, () => {
			test.beforeEach(async ({ page }) => {
				await page.goto("/");
				await uploadFile(page, fixture.name);
			});

			test("shows correct editor language", async ({ page }) => {
				const originalLang = await getEditorLanguage(page, "original");
				const convertedLang = await getEditorLanguage(page, "converted");
				expect(originalLang).toBe(
					fixture.format === "yml" ? "yaml" : fixture.format
				);
				expect(convertedLang).toBe(
					fixture.format === "yml" ? "yaml" : fixture.format
				);
			});

			test("displays original content correctly", async ({ page }) => {
				const original = await getOriginalContent(page);
				const expectedOriginal = await getFixtureContent(fixture.name);
				expect(normalizeLineEndings(original)).toBe(
					normalizeLineEndings(expectedOriginal)
				);
			});

			test("converts correctly with all protections enabled", async ({
				page,
			}) => {
				await waitForConversion(page);
				const converted = await getConvertedContent(page);
				const expected = await getExpectedOutput(fixture.name);
				expect(normalizeLineEndings(converted)).toBe(
					normalizeLineEndings(expected)
				);
			});

			test("original content remains unchanged after conversion", async ({
				page,
			}) => {
				await waitForConversion(page);
				const original = await getOriginalContent(page);
				const expectedOriginal = await getFixtureContent(fixture.name);
				expect(normalizeLineEndings(original)).toBe(
					normalizeLineEndings(expectedOriginal)
				);
			});

			test("keys and non-string values remain unchanged", async ({ page }) => {
				await waitForConversion(page);
				const converted = await getConvertedContent(page);

				// Per-fixture non-string values and (unconverted) key names.
				const valueChecks: Record<string, string[]> = {
					"config.yaml": [
						"max-players: 100",
						"radius: 12.5",
						"enabled: true",
						"fallback: false",
						"spawn-location: null",
						"UPPERCASE_KEY:",
					],
					"config.yml": ["slots: 32", "open: true", "entry: null", "tags:"],
					"config.json": [
						'"maxPlayers": 100',
						'"price": 12.5',
						'"enabled": true',
						'"disabled": false',
						'"unknown": null',
					],
					"config.properties": [
						"server.max-players = 100",
						"server.enabled=true",
					],
					"large.properties": ["key2="],
				};
				const checks = valueChecks[fixture.name] ?? [];
				for (const check of checks) {
					expect(converted).toContain(check);
				}

				if (fixture.format !== "properties") {
					expect(converted).not.toContain("ᴅɪꜱᴘʟᴀʏ-ɴᴀᴍᴇ");
					expect(converted).not.toContain("ᴍᴀx-ᴘʟᴀʏᴇʀꜱ");
				}
			});

			test("comments remain unchanged", async ({ page }) => {
				await waitForConversion(page);
				const converted = await getConvertedContent(page);
				const commentChecks: Partial<Record<string, string>> = {
					"config.yaml": "# Header comment would convert wrongly",
					"config.yml": "# .yml variant &#FF00AA {player}",
					"config.properties":
						"# Server configuration. If this comment were converted",
					"large.properties": "#",
				};
				const check = commentChecks[fixture.name];
				if (check) {
					expect(converted).toContain(check);
				}
				if (fixture.format === "json") {
					// JSON has no comments; nothing to verify.
					expect(converted).toContain("{");
				}
			});

			test("copy output works", async ({ page }) => {
				await waitForConversion(page);
				await clickCopyOutput(page);
				const clipboard = await getClipboardText(page);
				const expected = await getExpectedOutput(fixture.name);
				// Clipboard might have trailing newline differences
				expect(normalizeLineEndings(clipboard)).toBe(
					normalizeLineEndings(expected)
				);
			});

			test("download output works", async ({ page }) => {
				await waitForConversion(page);
				const download = await clickDownload(page);
				expect(download.suggestedFilename()).toBe(fixture.name);

				const downloadPath = await download.path();
				if (downloadPath) {
					const content = fs.readFileSync(downloadPath, "utf-8");
					const expected = await getExpectedOutput(fixture.name);
					expect(normalizeLineEndings(content)).toBe(
						normalizeLineEndings(expected)
					);
				}
			});
		});
	}
});

test.describe("Invalid File Handling", () => {
	test("shows syntax error for invalid JSON", async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "broken.json");
		await page.waitForTimeout(500);

		const status = await getStatusBarText(page);
		expect(status).toContain("Syntax error");

		const converted = await getConvertedContent(page);
		expect(converted).toBe("");
	});
});

test.describe("Conversion Rules Dropdown", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);
	});

	test("dropdown opens and shows all sections", async ({ page }) => {
		await openConversionRules(page);

		await expect(
			page.locator('[role="menuitem"]', { hasText: "String Values Only" })
		).toBeVisible();

		await expect(
			page.locator('[role="menuitemcheckbox"]', {
				hasText: "example} (braces)",
			})
		).toBeVisible();
		await expect(
			page.locator('[role="menuitemcheckbox"]', {
				hasText: "<example> (angles)",
			})
		).toBeVisible();
		await expect(
			page.locator('[role="menuitemcheckbox"]', {
				hasText: "%example% (percent)",
			})
		).toBeVisible();

		await expect(
			page.locator('[role="menuitemcheckbox"]', { hasText: "Legacy & codes" })
		).toBeVisible();
		await expect(
			page.locator('[role="menuitemcheckbox"]', {
				hasText: "Section sign § codes",
			})
		).toBeVisible();
		await expect(
			page.locator('[role="menuitemcheckbox"]', { hasText: "Minecraft hex" })
		).toBeVisible();

		await expect(
			page.locator('[role="menuitemcheckbox"]', { hasText: "&#RRGGBB" })
		).toBeVisible();
		await expect(
			page.locator('[role="menuitemcheckbox"]', {
				hasText: "Standalone #RRGGBB",
			})
		).toBeVisible();
		await expect(
			page.locator('[role="menuitemcheckbox"]', { hasText: "Embedded #RRGGBB" })
		).toBeVisible();

		await expect(
			page.locator('[role="menuitemcheckbox"]', { hasText: "Unicode escapes" })
		).toBeVisible();
		await expect(
			page.locator('[role="menuitemcheckbox"]', { hasText: "Generic escapes" })
		).toBeVisible();

		await expect(
			page.locator('[role="menuitem"]', { hasText: "Enable All" })
		).toBeVisible();
		await expect(
			page.locator('[role="menuitem"]', { hasText: "Disable All" })
		).toBeVisible();
		await expect(
			page.locator('[role="menuitem"]', { hasText: "Reset Defaults" })
		).toBeVisible();
	});

	test("mandatory string-only rule cannot be disabled", async ({ page }) => {
		await openConversionRules(page);
		const mandatoryItem = page.locator('[role="menuitem"]', {
			hasText: "String Values Only",
		});
		await expect(mandatoryItem).toBeDisabled();
	});

	test("toggling placeholder braces protection", async ({ page }) => {
		await waitForConversion(page);

		await openConversionRules(page);
		await toggleProtectionRule(page, "example} (braces)");

		// Wait for re-conversion after protection change
		await page.waitForTimeout(1000);
		const converted = await getConvertedContent(page);

		// String-value braces contents now convert; the YAML comment line is
		// never a string value, so its {player} must remain untouched.
		expect(converted).toContain("{ᴘʟᴀʏᴇʀ}");
		expect(converted).toContain("&l{ᴘʟᴀʏᴇʀ}!");
		expect(converted).toContain(
			"# Header comment would convert wrongly if comments were parsed: {player}"
		);
	});

	test("toggling legacy formatting protection", async ({ page }) => {
		await waitForConversion(page);

		let converted = await getConvertedContent(page);
		expect(converted).toContain("&aᴘʟᴀʏᴇʀ");

		await openConversionRules(page);
		await toggleProtectionRule(page, "Legacy & codes");

		await page.waitForTimeout(1000);
		converted = await getConvertedContent(page);

		// The & code letter itself now converts (&a -> &ᴀ).
		expect(converted).toContain("&ᴀᴘʟᴀʏᴇʀ");
		expect(converted).not.toContain("&aᴘʟᴀʏᴇʀ");
	});

	test("toggling standalone hex color protection", async ({ page }) => {
		await waitForConversion(page);

		let converted = await getConvertedContent(page);
		expect(converted).toContain("#FFFFFF");

		await openConversionRules(page);
		await toggleProtectionRule(page, "Standalone #RRGGBB");

		await page.waitForTimeout(1000);
		converted = await getConvertedContent(page);

		// Embedded hex protection is still enabled, so #FFFFFF stays protected
		// until the embedded rule is disabled as well.
		expect(converted).toContain("#FFFFFF");

		await openConversionRules(page);
		await toggleProtectionRule(page, "Embedded #RRGGBB");

		await page.waitForTimeout(1000);
		converted = await getConvertedContent(page);
		expect(converted).not.toContain("#FFFFFF");
		await page.keyboard.press("Escape");
	});

	test("toggling embedded hex color protection", async ({ page }) => {
		await waitForConversion(page);

		// Ensure clean state: both standalone and embedded enabled.
		await openConversionRules(page);
		await clickDropdownAction(page, "Enable All");
		await page.waitForTimeout(300);

		let converted = await getConvertedContent(page);
		expect(converted).toContain("#FFFFFF");

		await openConversionRules(page);
		await toggleProtectionRule(page, "Embedded #RRGGBB");

		await page.waitForTimeout(1000);
		converted = await getConvertedContent(page);

		// Standalone is still enabled, so #FFFFFF should STILL be protected.
		expect(converted).toContain("#FFFFFF");

		// Now also disable standalone.
		await openConversionRules(page);
		await toggleProtectionRule(page, "Standalone #RRGGBB");

		await page.waitForTimeout(1000);
		converted = await getConvertedContent(page);
		expect(converted).not.toContain("#FFFFFF");
		await page.keyboard.press("Escape");
	});

	test("enable all protections", async ({ page }) => {
		await openConversionRules(page);

		await clickDropdownAction(page, "Disable All");
		await waitForConversion(page);

		await openConversionRules(page);
		await clickDropdownAction(page, "Enable All");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		const expected = await getExpectedOutput("config.yaml");
		expect(normalizeLineEndings(converted)).toBe(
			normalizeLineEndings(expected)
		);
	});

	test("disable all protections", async ({ page }) => {
		await openConversionRules(page);
		await clickDropdownAction(page, "Disable All");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		expect(converted.length).toBeGreaterThan(0);
	});

	test("reset defaults", async ({ page }) => {
		await openConversionRules(page);
		await toggleProtectionRule(page, "example} (braces)");
		await toggleProtectionRule(page, "Legacy & codes");
		await clickDropdownAction(page, "Reset Defaults");

		await page.waitForTimeout(1000);

		const converted = await getConvertedContent(page);
		const expected = await getExpectedOutput("config.yaml");
		expect(normalizeLineEndings(converted)).toBe(
			normalizeLineEndings(expected)
		);
	});

	test("settings persist after reload", async ({ page }) => {
		await openConversionRules(page);
		await toggleProtectionRule(page, "example} (braces)");
		await page.waitForTimeout(1000);

		await page.reload();
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		expect(converted).toContain("{ᴘʟᴀʏᴇʀ}");
	});

	test("settings persist across file changes", async ({ page }) => {
		await openConversionRules(page);
		await toggleProtectionRule(page, "example} (braces)");
		await page.waitForTimeout(1000);

		await uploadFile(page, "config.json");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		expect(converted).toContain("{ᴘʟᴀʏᴇʀ}");
	});
});

test.describe("Enable/Disable All Protections", () => {
	const RULE_COUNT = 11;

	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);
	});

	/** aria-checked state of every configurable protection checkbox. */
	async function getRuleStates(page: Page): Promise<boolean[]> {
		return await page.evaluate(() =>
			Array.from(
				document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')
			).map((el) => el.getAttribute("aria-checked") === "true")
		);
	}

	async function getStoredConfig(page: Page): Promise<Record<string, unknown>> {
		return await page.evaluate(() =>
			JSON.parse(
				window.localStorage.getItem("fast-smallcap:protection-config") ?? "{}"
			)
		);
	}

	test("enable all checks every rule and produces protected output", async ({
		page,
	}) => {
		await openConversionRules(page);
		await clickDropdownAction(page, "Enable All");

		await page.waitForTimeout(400);
		const converted = await getConvertedContent(page);
		const expected = await getExpectedOutput("config.yaml");
		expect(normalizeLineEndings(converted)).toBe(
			normalizeLineEndings(expected)
		);

		// Every checkbox shows enabled state (aria-checked), with no stragglers.
		await openConversionRules(page);
		const states = await getRuleStates(page);
		expect(states).toHaveLength(RULE_COUNT);
		expect(states.every(Boolean)).toBe(true);

		// Engine configuration itself is fully enabled.
		const stored = await getStoredConfig(page);
		expect(Object.values(stored).every(Boolean)).toBe(true);

		// The mandatory string-only rule stays disabled (= not toggleable).
		await expect(
			page.locator('[role="menuitem"]', { hasText: "String Values Only" })
		).toBeDisabled();
		await page.keyboard.press("Escape");
	});

	test("disable all unchecks every rule and converts in strings", async ({
		page,
	}) => {
		await openConversionRules(page);
		await clickDropdownAction(page, "Disable All");

		await page.waitForTimeout(400);
		const converted = await getConvertedContent(page);

		// Nothing is protected anymore: placeholders, formatting codes, values
		// all convert inside string values.
		expect(converted).toContain("ʜᴇʟʟᴏ &ᴀᴘʟᴀʏᴇʀ {ᴘʟᴀʏᴇʀ}!");
		expect(converted).toContain("<ꜱᴇʀᴠᴇʀ> §ᴄʟᴏʙʙʏ %ᴘʟᴀʏᴇʀ%");
		expect(converted).toContain("#ꜰꜰꜰꜰꜰꜰ");

		// Mandatory string-only conversion stays enforced: keys, numbers,
		// booleans, null and comments never convert.
		expect(converted).toContain("max-players: 100");
		expect(converted).toContain("UPPERCASE_KEY");
		expect(converted).toContain("enabled: true");
		expect(converted).toContain("spawn-location: null");
		expect(converted).toContain('date-string: "2026-11-05"');
		expect(converted).toContain(
			"# Header comment would convert wrongly if comments were parsed: {player} &#FF00AA"
		);

		await openConversionRules(page);
		const states = await getRuleStates(page);
		expect(states).toHaveLength(RULE_COUNT);
		expect(states.every((state) => !state)).toBe(true);

		const stored = await getStoredConfig(page);
		expect(Object.values(stored).every((value) => value === false)).toBe(true);
		await page.keyboard.press("Escape");
	});

	test("rapid consecutive clicks end in a consistent state", async ({
		page,
	}) => {
		// Alternate quickly between the two actions; the final action wins and
		// state/output must agree with it (no stale closures).
		const actions = [
			"Enable All",
			"Disable All",
			"Enable All",
			"Disable All",
			"Enable All",
		];
		for (const label of actions) {
			await openConversionRules(page);
			await clickDropdownAction(page, label);
		}

		await openConversionRules(page);
		const states = await getRuleStates(page);
		expect(states).toHaveLength(RULE_COUNT);
		// Last action was Enable All.
		expect(states.every(Boolean)).toBe(true);

		const stored = await getStoredConfig(page);
		expect(Object.values(stored).every(Boolean)).toBe(true);
		await page.keyboard.press("Escape");

		const converted = await getConvertedContent(page);
		const expected = await getExpectedOutput("config.yaml");
		expect(normalizeLineEndings(converted)).toBe(
			normalizeLineEndings(expected)
		);
	});

	test("individual toggles work after batch actions", async ({ page }) => {
		await openConversionRules(page);
		await clickDropdownAction(page, "Enable All");

		await openConversionRules(page);
		await toggleProtectionRule(page, "example} (braces)");
		await page.waitForTimeout(1000);
		// Checkbox items don't close the menu; close before reopening.
		await page.keyboard.press("Escape");
		await page.waitForTimeout(200);

		await openConversionRules(page);
		const states = await getRuleStates(page);
		expect(states).toHaveLength(RULE_COUNT);
		// Only the braces rule is disabled; all others stay enabled.
		expect(states.filter(Boolean).length).toBe(RULE_COUNT - 1);
		const braceItem = page.locator('[role="menuitemcheckbox"]', {
			hasText: "example} (braces)",
		});
		await expect(braceItem).toHaveAttribute("aria-checked", "false");
		await page.keyboard.press("Escape");

		const converted = await getConvertedContent(page);
		// Braces contents convert again (only &l formatting still protected)...
		expect(converted).toContain("&l{ᴘʟᴀʏᴇʀ}!");
		// ...while every other rule stays protected.
		expect(converted).toContain("&aᴘʟᴀʏᴇʀ"); // legacy formatting
		expect(converted).toContain("%player%"); // percent placeholders
		expect(converted).toContain("#FFFFFF"); // hex colors
	});

	test("disable all persists after reload", async ({ page }) => {
		await openConversionRules(page);
		await clickDropdownAction(page, "Disable All");
		await page.reload();
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		expect(converted).toContain("<ꜱᴇʀᴠᴇʀ> §ᴄʟᴏʙʙʏ %ᴘʟᴀʏᴇʀ%");

		// Settings reloaded from localStorage stay disabled across reloads.
		const stored = await getStoredConfig(page);
		expect(Object.values(stored).every((value) => value === false)).toBe(true);

		await openConversionRules(page);
		const states = await getRuleStates(page);
		expect(states).toHaveLength(RULE_COUNT);
		expect(states.every((state) => !state)).toBe(true);
	});

	test("enable all persists after reload", async ({ page }) => {
		await openConversionRules(page);
		await clickDropdownAction(page, "Disable All");
		await openConversionRules(page);
		await clickDropdownAction(page, "Enable All");
		await page.reload();
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		const expected = await getExpectedOutput("config.yaml");
		expect(normalizeLineEndings(converted)).toBe(
			normalizeLineEndings(expected)
		);

		await openConversionRules(page);
		const states = await getRuleStates(page);
		expect(states.every(Boolean)).toBe(true);
	});
});

test.describe("Editor Interaction", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);
	});

	test("editing original content triggers auto-conversion", async ({
		page,
	}) => {
		const originalValue = await getOriginalContent(page);
		await setEditorValue(
			page,
			"original",
			originalValue + "\nnew-key: test value"
		);

		// Wait for debounced auto-conversion (300ms default)
		await page.waitForTimeout(1000);

		const converted = await getConvertedContent(page);
		expect(converted).toContain("new-key: ᴛᴇꜱᴛ ᴠᴀʟᴜᴇ");
	});

	test("converted editor is read-only", async ({ page }) => {
		await page.waitForTimeout(1000);
		const isReadOnly = await getReadOnly(page);
		expect(isReadOnly).toBe(true);
	});

	test("word wrap toggle works", async ({ page }) => {
		const switchWrap = page.getByRole("switch", { name: "Toggle word wrap" });
		await expect(switchWrap).toBeChecked();

		await switchWrap.uncheck();
		await page.waitForTimeout(500);

		const wordWrapOff = await getWordWrap(page);
		expect(wordWrapOff).toBe("off");

		await switchWrap.check();
		await page.waitForTimeout(500);

		const wordWrapOn = await getWordWrap(page);
		expect(wordWrapOn).toBe("on");
	});

	test("font size change works", async ({ page }) => {
		// Click the select trigger first
		await page.getByRole("combobox", { name: "Font size" }).click();
		// Select the option
		await page.getByRole("option", { name: "16px" }).click();
		await page.waitForTimeout(500);

		const fontSize = await getFontSize(page);
		expect(fontSize).toBe(16);
	});

	test("clear functionality", async ({ page }) => {
		await clickClear(page);

		const original = await getOriginalContent(page);
		const converted = await getConvertedContent(page);
		const status = await getStatusBarText(page);

		expect(original).toBe("");
		expect(converted).toBe("");
		expect(status).toContain("No file");
		expect(status).toContain("0 characters");
		expect(status).toContain("Ready");
	});

	test("uploading replacement file", async ({ page }) => {
		await uploadFile(page, "config.json");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		const expected = await getExpectedOutput("config.json");
		expect(normalizeLineEndings(converted)).toBe(
			normalizeLineEndings(expected)
		);
	});

	test("debouncing with larger documents", async ({ page }) => {
		await uploadFile(page, "large.properties");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		const expected = await getExpectedOutput("large.properties");
		expect(normalizeLineEndings(converted)).toBe(
			normalizeLineEndings(expected)
		);
	});
});

test.describe("Minecraft Configuration Testing", () => {
	test("complex Minecraft plugin config - YAML", async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);

		expect(converted).toContain("{player}");
		expect(converted).toContain("<server>");
		expect(converted).toContain("%player%");
		expect(converted).toContain("&a");
		expect(converted).toContain("§c");
		expect(converted).toContain("§x§F§F§0§0§A§A");
		expect(converted).toContain("&#FF00AA");
		expect(converted).toContain("#FFFFFF");
		expect(converted).toContain("#12abef");
		expect(converted).toContain("#1a2b3c");

		expect(converted).toContain("ᴡᴇʟᴄᴏᴍᴇ");
		expect(converted).toContain("ꜱᴇᴄᴏɴᴅ");
		expect(converted).toContain("ꜰᴏʟᴅᴇᴅ");
		expect(converted).toContain("ᴀɴᴄʜᴏʀᴇᴅ");
		expect(converted).toContain("ᴍɪxᴇᴅ");
		expect(converted).toContain("ᴅᴇᴇᴘ");
		expect(converted).toContain("ꜰɪʀꜱᴛ");
		expect(converted).toContain("ᴘʟᴀɪɴ");
		expect(converted).toContain("ʜᴀʀᴅ");
	});

	test("complex Minecraft plugin config - Properties", async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.properties");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);

		expect(converted).toContain("{player}");
		expect(converted).toContain("<player>");
		expect(converted).toContain("%player%");
		expect(converted).toContain("&a");
		expect(converted).toContain("§c");
		expect(converted).toContain("&#FF00AA");
		expect(converted).toContain("#000000");
		expect(converted).toContain("#FFFFFF");
		expect(converted).toContain("#12abef");

		expect(converted).toContain("ᴍʏ ᴍɪɴᴇᴄʀᴀꜰᴛ");
		expect(converted).toContain("ᴡᴇʟᴄᴏᴍᴇ");
		expect(converted).toContain("ᴄᴀꜰé");
		expect(converted).toContain("ᴠᴀʟᴜᴇ");
		expect(converted).toContain("ᴛʜɪꜱ");
		expect(converted).toContain("ʟᴏɴɢ");
		expect(converted).toContain("ᴜᴘᴘᴇʀ");
		expect(converted).toContain("ᴘʟᴀɪɴ");
	});
});

test.describe("Properties Textual Values Only", () => {
	test("textualOnly option works for properties", async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.properties");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);

		expect(converted).toContain("100");
		expect(converted).toContain("true");

		expect(converted).toContain("ᴍʏ ᴍɪɴᴇᴄʀᴀꜰᴛ");
	});

	test("can disable textualOnly via toolbar switch", async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.properties");
		await waitForConversion(page);

		const switchTextual = page.getByRole("switch", {
			name: "Convert only textual values",
		});
		await expect(switchTextual).toBeChecked();
		await switchTextual.uncheck();
		await page.waitForTimeout(300);

		const converted = await getConvertedContent(page);

		expect(converted).toContain("ᴛʀᴜᴇ");
	});
});

test.describe("Unicode and Special Characters", () => {
	test("handles unicode correctly", async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		expect(converted).toContain("日本語");
		expect(converted).toContain("é");
		expect(converted).toContain("ᴄᴀꜰé ᴅéᴊà ᴠᴜ");
	});

	test("handles empty strings and whitespace", async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.yaml");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		expect(converted).toContain('empty-name: ""');
		expect(converted).toContain('whitespace-only: "   "');
	});

	test("handles escaped characters", async ({ page }) => {
		await page.goto("/");
		await uploadFile(page, "config.properties");
		await waitForConversion(page);

		const converted = await getConvertedContent(page);
		expect(converted).toContain("\\:");
		expect(converted).toContain("\\=");
	});
});
