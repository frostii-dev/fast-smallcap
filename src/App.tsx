import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { editor } from "monaco-editor";
import { EditorPanel } from "@/components/EditorPanel";
import { Header } from "@/components/Header";
import { StatusBar } from "@/components/StatusBar";
import { Toolbar } from "@/components/Toolbar";
import { useConverter } from "@/hooks/useConverter";
import { cn } from "@/lib/utils";
import {
	ACCEPTED_EXTENSIONS,
	downloadTextFile,
	getMonacoLanguage,
} from "@/lib/file-utils";
import "@/lib/monaco-setup";

const FONT_SIZE_STORAGE_KEY = "fast-smallcap:font-size";
const WORD_WRAP_STORAGE_KEY = "fast-smallcap:word-wrap";

export default function App() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const originalEditorRef = useRef<{
		getEditor: () => editor.IStandaloneCodeEditor | undefined;
	} | null>(null);
	const convertedEditorRef = useRef<{
		getEditor: () => editor.IStandaloneCodeEditor | undefined;
	} | null>(null);

	// Persist font size to localStorage
	const [fontSize, setFontSize] = useState<number>(() => {
		if (typeof window === "undefined") {
			return 13;
		}
		try {
			const stored = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
			if (stored !== null) {
				const parsed = parseInt(stored, 10);
				if (!isNaN(parsed) && parsed >= 8 && parsed <= 72) {
					return parsed;
				}
			}
		} catch {
			// Ignore read errors, use default
		}
		return 13;
	});

	// Persist word wrap to localStorage
	const [wordWrap, setWordWrap] = useState<boolean>(() => {
		if (typeof window === "undefined") {
			return true;
		}
		try {
			const stored = window.localStorage.getItem(WORD_WRAP_STORAGE_KEY);
			if (stored !== null) {
				return stored === "true";
			}
		} catch {
			// Ignore read errors, use default
		}
		return true;
	});

	const {
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
	} = useConverter();

	const openFilePicker = useCallback(() => {
		clearError();
		fileInputRef.current?.click();
	}, [clearError]);

	const handleFileChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const selected = event.target.files?.[0];
			event.target.value = "";
			if (selected) {
				void openFile(selected);
			}
		},
		[openFile]
	);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(getConverted());
			return true;
		} catch {
			return false;
		}
	}, [getConverted]);

	const handleDownload = useCallback(() => {
		downloadTextFile(
			file === null ? "converted.txt" : file.name,
			getConverted(),
			file === null ? null : file.format
		);
	}, [file, getConverted]);

	return (
		<main className="isolate flex h-svh flex-col overflow-hidden bg-background text-foreground">
			<Header onOpenFile={openFilePicker} />
			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_EXTENSIONS}
				className="hidden"
				onChange={handleFileChange}
			/>
			<Toolbar
				onConvert={convertNow}
				onCopy={handleCopy}
				onDownload={handleDownload}
				onClear={clear}
				hasContent={content.length > 0}
				fontSize={fontSize}
				onFontSizeChange={(size) => {
					setFontSize(size);
					if (typeof window !== "undefined") {
						try {
							window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(size));
						} catch {
							// Ignore write errors
						}
					}
				}}
				wordWrap={wordWrap}
				onWordWrapChange={(wrap) => {
					setWordWrap(wrap);
					if (typeof window !== "undefined") {
						try {
							window.localStorage.setItem(WORD_WRAP_STORAGE_KEY, String(wrap));
						} catch {
							// Ignore write errors
						}
					}
				}}
				textualOnly={textualOnly}
				onTextualOnlyChange={setTextualOnly}
				showTextualOnly={file?.format === "properties"}
				protectionConfig={protectionConfig}
				onProtectionRuleChange={setProtectionRule}
				onEnableAllProtections={enableAllProtections}
				onDisableAllProtections={disableAllProtections}
				onResetProtections={resetProtections}
				autoConvert={autoConvert}
				onAutoConvertChange={setAutoConvert}
			/>
			<div className="flex min-h-0 flex-1 overflow-hidden">
				{/* Editors panel */}
				<div
					className={cn(
						"flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-200"
					)}
				>
					<div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
						<EditorPanel
							ref={originalEditorRef}
							title="Original"
							value={content}
							language={getMonacoLanguage(file === null ? null : file.format)}
							fontSize={fontSize}
							wordWrap={wordWrap}
							onChange={setContent}
						/>
						<EditorPanel
							ref={convertedEditorRef}
							title="Converted"
							value={output}
							language={getMonacoLanguage(file === null ? null : file.format)}
							readOnly
							fontSize={fontSize}
							wordWrap={wordWrap}
						/>
					</div>
				</div>
			</div>
			<StatusBar
				fileName={file?.name ?? null}
				format={file?.format ?? null}
				charCount={content.length}
				status={status}
				validation={validation}
				error={error}
			/>
		</main>
	);
}
