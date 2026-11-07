import { useCallback, useEffect, useRef, useState } from "react";
import { convertToSmallCaps } from "@/lib/converter";
import { convertDocument } from "@/lib/document-converter";
import { validateSyntax, type SyntaxValidation } from "@/lib/validation";
import {
	getStoredDocument,
	isIndexedDBAvailable,
	saveDocument,
} from "@/lib/idb";
import {
	loadProtectionConfig,
	saveProtectionConfig,
	type ProtectionConfig,
	DEFAULT_PROTECTION_CONFIG,
} from "@/lib/protection-config";

const AUTO_CONVERT_STORAGE_KEY = "fast-smallcap:auto-convert";
import type { ConversionStatus, FileFormat, LoadedFileInfo } from "@/types";

// For openFile callback
import { getFormatFromName } from "@/lib/file-utils";

const AUTO_CONVERT_DELAY_MS = 300;

/**
 * Debounce delay (ms) before writing document data to IndexedDB.
 * Avoids writing on every keystroke while keeping persistence timely.
 */
const IDB_WRITE_DELAY_MS = 500;

/**
 * Key for storing whether IndexedDB was successfully initialized.
 * Used to surface a warning if persistence cannot be guaranteed.
 */
const INDEXEDDB_READY_KEY = "fast-smallcap:idb-ready";

export function useConverter() {
	const [file, setFile] = useState<LoadedFileInfo | null>(null);
	const [content, setContent] = useState("");
	const [output, setOutput] = useState("");
	const [convertedSource, setConvertedSource] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [validation, setValidation] = useState<SyntaxValidation | null>(null);
	const [textualOnly, setTextualOnly] = useState(true);
	const [protectionConfig, setProtectionConfig] = useState<ProtectionConfig>(
		() => loadProtectionConfig()
	);

	// Persist protection config to localStorage
	useEffect(() => {
		saveProtectionConfig(protectionConfig);
	}, [protectionConfig]);

	// Persist auto-convert preference to localStorage (default: enabled)
	const [autoConvert, setAutoConvert] = useState<boolean>(() => {
		if (typeof window === "undefined") {
			return true;
		}
		try {
			const stored = window.localStorage.getItem(AUTO_CONVERT_STORAGE_KEY);
			if (stored !== null) {
				return stored === "true";
			}
		} catch {
			// Ignore read errors, use default
		}
		return true;
	});

	// Persist auto-convert preference
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		try {
			window.localStorage.setItem(
				AUTO_CONVERT_STORAGE_KEY,
				String(autoConvert)
			);
		} catch {
			// Ignore write errors
		}
	}, [autoConvert]);

	// Persist IndexedDB availability flag so we can warn the user if needed
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const ready = isIndexedDBAvailable();
		try {
			window.localStorage.setItem(INDEXEDDB_READY_KEY, String(ready));
			if (!ready) {
				console.warn(
					"[fast-smallcap] IndexedDB is not available in this browser. Document persistence will be disabled."
				);
			}
		} catch {
			// Ignore write errors
		}
	}, []);

	// Ref for debounced IndexedDB writes
	const idbWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	/**
	 * Debounced write of the current document to IndexedDB.
	 * Only writes when there is actual content to persist.
	 */
	const persistDocument = useCallback(() => {
		if (!isIndexedDBAvailable() || !file || content.length === 0) {
			return;
		}

		if (idbWriteTimer.current) {
			clearTimeout(idbWriteTimer.current);
		}

		idbWriteTimer.current = setTimeout(async () => {
			try {
				await saveDocument({
					name: file.name,
					format: file.format,
					content,
					output,
				});
			} catch (err) {
				console.warn("[fast-smallcap] Failed to persist document:", err);
			}
		}, IDB_WRITE_DELAY_MS);
	}, [file, content, output]);

	// Restore document from IndexedDB on startup (before any user interaction)
	useEffect(() => {
		let cancelled = false;

		async function restoreDocument(): Promise<void> {
			if (!isIndexedDBAvailable()) {
				return;
			}

			try {
				const stored = await getStoredDocument();
				if (stored && !cancelled) {
					// Validate schema version implicitly by checking required fields
					if (
						typeof stored.content === "string" &&
						typeof stored.output === "string" &&
						stored.name &&
						stored.format
					) {
						setFile({ name: stored.name, format: stored.format as FileFormat });
						setContent(stored.content);
						setOutput(stored.output);
						setConvertedSource(stored.content);
					}
				}
			} catch (err) {
				console.warn(
					"[fast-smallcap] Failed to restore document from IndexedDB:",
					err
				);
			}
		}

		void restoreDocument();

		return () => {
			cancelled = true;
			if (idbWriteTimer.current) {
				clearTimeout(idbWriteTimer.current);
			}
		};
	}, []);

	// Persist document to IndexedDB whenever content, output, or file changes
	useEffect(() => {
		persistDocument();
	}, [content, output, file, persistDocument]);

	// Run conversion with all discoverable string-value ranges
	const runConversion = useCallback(
		(source: string) => {
			if (file === null) {
				setOutput(convertToSmallCaps(source, protectionConfig));
				setError(null);
			} else {
				const result = convertDocument(source, file.format, {
					textualOnly,
					protectionConfig,
				});
				setOutput(result.output);
				setError(result.error);
			}
			setConvertedSource(source);
		},
		[file, textualOnly, protectionConfig]
	);

	// Debounced auto-conversion for content changes (only when Auto Convert is enabled)
	useEffect(() => {
		if (!autoConvert) {
			return undefined;
		}
		const timer = window.setTimeout(() => {
			runConversion(content);
			setValidation(
				validateSyntax(file === null ? null : file.format, content)
			);
		}, AUTO_CONVERT_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [content, file, runConversion, autoConvert]);

	// Immediate conversion for config changes (only when Auto Convert is enabled)
	const contentRef = useRef(content);
	useEffect(() => {
		contentRef.current = content;
	}, [content]);
	useEffect(() => {
		if (!autoConvert) {
			return undefined;
		}
		const source = contentRef.current;
		if (source.length === 0) {
			return undefined;
		}
		runConversion(source);
		setValidation(validateSyntax(file === null ? null : file.format, source));
	}, [protectionConfig, textualOnly, runConversion, file, autoConvert]);

	const convertNow = useCallback(() => {
		runConversion(content);
		setValidation(validateSyntax(file === null ? null : file.format, content));
	}, [content, file, runConversion]);

	const clear = useCallback(() => {
		setFile(null);
		setContent("");
		setOutput("");
		setConvertedSource("");
		setError(null);
		setValidation(null);
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	/** Converts the current source on demand (no debounce staleness). */
	const getConverted = useCallback(() => {
		if (file === null) {
			return convertToSmallCaps(content, protectionConfig);
		}
		return convertDocument(content, file.format, {
			textualOnly,
			protectionConfig,
		}).output;
	}, [content, file, textualOnly, protectionConfig]);

	/** Update a single protection rule and persist. */
	const setProtectionRule = useCallback(
		<K extends keyof ProtectionConfig>(key: K, value: ProtectionConfig[K]) => {
			setProtectionConfig((prev) => ({ ...prev, [key]: value }));
		},
		[]
	);

	/** Enable all protection rules (fresh object so React always re-renders). */
	const enableAllProtections = useCallback(() => {
		setProtectionConfig(() => ({ ...DEFAULT_PROTECTION_CONFIG }));
	}, []);

	/** Disable all protection rules. */
	const disableAllProtections = useCallback(() => {
		setProtectionConfig(() => {
			const allFalse = Object.keys(DEFAULT_PROTECTION_CONFIG).reduce(
				(acc, key) => ({ ...acc, [key]: false }),
				{} as ProtectionConfig
			);
			return allFalse;
		});
	}, []);

	/** Reset protection rules to defaults (atomic whole-config update). */
	const resetProtections = useCallback(() => {
		setProtectionConfig(() => ({ ...DEFAULT_PROTECTION_CONFIG }));
	}, []);

	const openFile = useCallback(async (selected: File) => {
		const format = getFormatFromName(selected.name);
		if (format === null) {
			setError(
				`Unsupported file type: ${selected.name}. Use .yaml, .yml, .json or .properties.`
			);
			setValidation(null);
			return;
		}
		try {
			const text = await selected.text();
			setFile({ name: selected.name, format });
			setContent(text);
			setError(null);
			setValidation(null);
		} catch {
			setError(`Could not read file: ${selected.name}`);
		}
	}, []);

	const status: ConversionStatus =
		content.length === 0
			? "idle"
			: convertedSource === content
				? "converted"
				: "converting";

	return {
		file,
		content,
		output,
		status,
		error,
		validation,
		textualOnly,
		setTextualOnly,
		protectionConfig,
		setProtectionRule,
		enableAllProtections,
		disableAllProtections,
		resetProtections,
		setContent,
		openFile,
		convertNow,
		clear,
		clearError,
		getConverted,
		autoConvert,
		setAutoConvert,
	};
}
