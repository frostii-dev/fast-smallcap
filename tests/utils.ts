import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestEditor {
	getValue?: () => string;
	getModel?: () => { getLanguageId?: () => string } | null;
	getOptions?: () => {
		fontSize?: number;
		wordWrap?: string;
		readOnly?: boolean;
	} | null;
}

export async function uploadFile(page: Page, fixtureName: string) {
	const filePath = path.resolve(__dirname, "fixtures", fixtureName);
	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(filePath);
	await page.waitForTimeout(500);
}

export async function getOriginalContent(page: Page): Promise<string> {
	return await page.evaluate(() => {
		const editor = (window as Record<string, unknown>).testOriginalEditor as
			TestEditor | undefined;
		if (!editor) return "";
		return editor.getValue?.() ?? "";
	});
}

export async function getConvertedContent(page: Page): Promise<string> {
	return await page.evaluate(() => {
		const editor = (window as Record<string, unknown>).testConvertedEditor as
			TestEditor | undefined;
		if (!editor) return "";
		return editor.getValue?.() ?? "";
	});
}

export async function getExpectedOutput(fixtureName: string): Promise<string> {
	const expectedPath = path.resolve(__dirname, "expected", fixtureName);
	return fs.readFileSync(expectedPath, "utf-8");
}

/** Raw fixture content (the app should display it byte-for-byte). */
export async function getFixtureContent(fixtureName: string): Promise<string> {
	const fixturePath = path.resolve(__dirname, "fixtures", fixtureName);
	return fs.readFileSync(fixturePath, "utf-8");
}

export async function clickConvert(page: Page) {
	await page.getByRole("button", { name: "Convert" }).click();
	await page.waitForTimeout(300);
}

export async function clickCopyOutput(page: Page) {
	await page.getByRole("button", { name: "Copy Output" }).click();
	await page.waitForTimeout(200);
}

export async function clickDownload(page: Page) {
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download" }).click();
	return await downloadPromise;
}

export async function clickClear(page: Page) {
	await page.getByRole("button", { name: "Clear" }).click();
	await page.waitForTimeout(300);
}

export async function openConversionRules(page: Page) {
	// Close any already-open menu first (base-ui menus don't auto-close on outside click)
	await page.keyboard.press("Escape");
	await page.waitForTimeout(100);
	await page.getByLabel("Conversion rules").click();
	await page.waitForTimeout(200);
}

export async function toggleProtectionRule(page: Page, label: string) {
	const checkbox = page.locator(`[role="menuitemcheckbox"]`, {
		hasText: label,
	});
	await checkbox.click();
	// Wait for debounced re-conversion
	await page.waitForTimeout(500);
}

export async function clickDropdownAction(page: Page, label: string) {
	await page.locator(`[role="menuitem"]`, { hasText: label }).click();
	await page.waitForTimeout(500);
}

export async function getStatusBarText(page: Page): Promise<string> {
	return (await page.locator("footer").textContent()) ?? "";
}

export async function getEditorLanguage(
	page: Page,
	which: "original" | "converted"
): Promise<string> {
	return await page.evaluate(
		(idx) => {
			const editor =
				idx === 0
					? ((window as Record<string, unknown>).testOriginalEditor as
							TestEditor | undefined)
					: ((window as Record<string, unknown>).testConvertedEditor as
							TestEditor | undefined);
			if (!editor) return "";
			return editor.getModel?.()?.getLanguageId?.() ?? "";
		},
		which === "original" ? 0 : 1
	);
}

export async function waitForConversion(page: Page, expectedLength?: number) {
	await page.waitForFunction(
		(len) => {
			const editor = (window as Record<string, unknown>).testConvertedEditor as
				TestEditor | undefined;
			if (!editor) return false;
			const converted = editor.getValue?.() ?? "";
			return converted.length > 0 && (!len || converted.length === len);
		},
		expectedLength,
		{ timeout: 120000 }
	);
}

export function normalizeLineEndings(text: string): string {
	return text.replace(/\r\n/g, "\n");
}

export async function getClipboardText(page: Page): Promise<string> {
	return await page.evaluate(async () => {
		try {
			return await navigator.clipboard.readText();
		} catch {
			return "";
		}
	});
}

export async function setEditorValue(
	page: Page,
	which: "original" | "converted",
	value: string
) {
	await page.evaluate(
		(args) => {
			const editor =
				args.idx === 0
					? ((window as Record<string, unknown>).testOriginalEditor as
							TestEditor | undefined)
					: ((window as Record<string, unknown>).testConvertedEditor as
							TestEditor | undefined);
			if (editor) {
				// setValue fires onDidChangeModelContent, driving the app's onChange.
				editor.setValue?.(args.value);
			}
		},
		{ idx: which === "original" ? 0 : 1, value }
	);
}

// monaco.editor.EditorOption numeric ids (@standaloneEnums.js); getOptions()
// does not expose these keys reliably, so read via getOption(id).
export const MONACO_EDITOR_OPTION = {
	readOnly: 104,
	fontSize: 61,
	wordWrap: 149,
} as const;

export async function getEditorOption(
	page: Page,
	which: "original" | "converted",
	optionId: number
): Promise<unknown> {
	return await page.evaluate(
		(args) => {
			const editor =
				args.idx === 0
					? ((window as Record<string, unknown>).testOriginalEditor as
							{ getOption?: (id: number) => unknown } | undefined)
					: ((window as Record<string, unknown>).testConvertedEditor as
							{ getOption?: (id: number) => unknown } | undefined);
			return editor?.getOption?.(args.optionId);
		},
		{ idx: which === "original" ? 0 : 1, optionId }
	);
}

export async function getFontSize(page: Page): Promise<number> {
	const value = await getEditorOption(
		page,
		"original",
		MONACO_EDITOR_OPTION.fontSize
	);
	return typeof value === "number" ? value : 0;
}

export async function getWordWrap(page: Page): Promise<string> {
	const value = await getEditorOption(
		page,
		"original",
		MONACO_EDITOR_OPTION.wordWrap
	);
	return value == null ? "" : String(value);
}

export async function getReadOnly(page: Page): Promise<boolean> {
	const value = await getEditorOption(
		page,
		"converted",
		MONACO_EDITOR_OPTION.readOnly
	);
	return value === true;
}
