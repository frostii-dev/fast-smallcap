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

export default function App() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const originalEditorRef = useRef<{
		getEditor: () => editor.IStandaloneCodeEditor | undefined;
	} | null>(null);
	const convertedEditorRef = useRef<{
		getEditor: () => editor.IStandaloneCodeEditor | undefined;
	} | null>(null);
	const [fontSize, setFontSize] = useState(13);
	const [wordWrap, setWordWrap] = useState(true);
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
				onFontSizeChange={setFontSize}
				wordWrap={wordWrap}
				onWordWrapChange={setWordWrap}
				textualOnly={textualOnly}
				onTextualOnlyChange={setTextualOnly}
				showTextualOnly={file?.format === "properties"}
				protectionConfig={protectionConfig}
				onProtectionRuleChange={setProtectionRule}
				onEnableAllProtections={enableAllProtections}
				onDisableAllProtections={disableAllProtections}
				onResetProtections={resetProtections}
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
