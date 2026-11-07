import { useCallback, useEffect, useRef, useState } from "react";
import { convertToSmallCaps } from "@/lib/converter";
import { convertDocument } from "@/lib/document-converter";
import { validateSyntax, type SyntaxValidation } from "@/lib/validation";
import {
	loadProtectionConfig,
	saveProtectionConfig,
	type ProtectionConfig,
	DEFAULT_PROTECTION_CONFIG,
} from "@/lib/protection-config";
import type { ConversionStatus, LoadedFileInfo } from "@/types";

// For openFile callback
import { getFormatFromName } from "@/lib/file-utils";

const AUTO_CONVERT_DELAY_MS = 300;

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

	// Debounced auto-conversion for content changes
	useEffect(() => {
		const timer = window.setTimeout(() => {
			runConversion(content);
			setValidation(
				validateSyntax(file === null ? null : file.format, content)
			);
		}, AUTO_CONVERT_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [content, file, runConversion]);

	// Immediate conversion for config changes
	const contentRef = useRef(content);
	useEffect(() => {
		contentRef.current = content;
	}, [content]);
	useEffect(() => {
		const source = contentRef.current;
		if (source.length === 0) {
			return;
		}
		runConversion(source);
		setValidation(validateSyntax(file === null ? null : file.format, source));
	}, [protectionConfig, textualOnly, runConversion, file]);

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
	};
}
