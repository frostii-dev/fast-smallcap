/**
 * Configuration for which protection rules are active during conversion.
 * All rules default to enabled.
 */
export interface ProtectionConfig {
	/** {placeholder} protection */
	placeholderBraces: boolean;
	/** <placeholder> protection */
	placeholderAngles: boolean;
	/** %placeholder% protection */
	placeholderPercent: boolean;
	/** Legacy & formatting codes (&0-9, &a-f, &k-o, &r) */
	legacyFormatting: boolean;
	/** Section-sign § formatting codes */
	sectionFormatting: boolean;
	/** Minecraft §x§R§R§G§G§B§B hex formatting */
	minecraftHexFormatting: boolean;
	/** &#RRGGBB ampersand hex colors */
	ampHexColors: boolean;
	/** Standalone #RRGGBB hex colors */
	standaloneHexColors: boolean;
	/** Embedded #RRGGBB hex colors (within text) */
	embeddedHexColors: boolean;
	/** \uXXXX unicode escape sequences */
	unicodeEscapes: boolean;
	/** Generic escape sequences (\n, \t, \\, \", etc.) */
	genericEscapes: boolean;
	/** Remove emoji characters from string values */
	removeEmoji: boolean;
	/** Remove whitespace to the left of removed emojis */
	removeEmojiLeftSpace: boolean;
	/** Remove whitespace to the right of removed emojis */
	removeEmojiRightSpace: boolean;
}

/** Default configuration with all protections enabled. */
export const DEFAULT_PROTECTION_CONFIG: ProtectionConfig = {
	placeholderBraces: true,
	placeholderAngles: true,
	placeholderPercent: true,
	legacyFormatting: true,
	sectionFormatting: true,
	minecraftHexFormatting: true,
	ampHexColors: true,
	standaloneHexColors: true,
	embeddedHexColors: true,
	unicodeEscapes: true,
	genericEscapes: true,
	removeEmoji: true,
	removeEmojiLeftSpace: true,
	removeEmojiRightSpace: true,
};

/** Storage key for persisting protection config. */
export const PROTECTION_CONFIG_STORAGE_KEY = "fast-smallcap:protection-config";

/** Load protection config from localStorage, falling back to defaults. */
export function loadProtectionConfig(): ProtectionConfig {
	if (typeof window === "undefined") {
		return DEFAULT_PROTECTION_CONFIG;
	}
	try {
		const stored = window.localStorage.getItem(PROTECTION_CONFIG_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Partial<ProtectionConfig>;
			return { ...DEFAULT_PROTECTION_CONFIG, ...parsed };
		}
	} catch {
		// Ignore parse errors, use defaults
	}
	return DEFAULT_PROTECTION_CONFIG;
}

/** Save protection config to localStorage. */
export function saveProtectionConfig(config: ProtectionConfig): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		window.localStorage.setItem(
			PROTECTION_CONFIG_STORAGE_KEY,
			JSON.stringify(config)
		);
	} catch {
		// Ignore write errors
	}
}
