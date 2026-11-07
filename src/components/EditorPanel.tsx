import Editor from "@monaco-editor/react";
import { ensurePropertiesLanguage } from "@/lib/monaco-setup";
import { useEffect, useImperativeHandle, forwardRef } from "react";
import type { editor } from "monaco-editor";

type EditorPanelProps = {
	title: string;
	value: string;
	language: string;
	readOnly?: boolean;
	fontSize: number;
	wordWrap: boolean;
	onChange?: (value: string) => void;
};

export const EditorPanel = forwardRef<
	{ getEditor: () => editor.IStandaloneCodeEditor | undefined },
	EditorPanelProps
>(
	(
		{ title, value, language, readOnly = false, fontSize, wordWrap, onChange },
		ref
	) => {
		// Expose editor for testing via onMount
		const handleMount = (editorInstance: editor.IStandaloneCodeEditor) => {
			const key =
				title === "Original" ? "testOriginalEditor" : "testConvertedEditor";
			(window as unknown as Record<string, unknown>)[key] = editorInstance;
		};

		const key =
			title === "Original" ? "testOriginalEditor" : "testConvertedEditor";

		// Expose editor instance to parent ref
		useImperativeHandle(ref, () => ({
			getEditor: () => {
				const win = window as unknown as Record<string, unknown>;
				return win[key] as editor.IStandaloneCodeEditor | undefined;
			},
		}));

		// Cleanup on unmount
		useEffect(() => {
			return () => {
				delete (window as unknown as Record<string, unknown>)[key];
			};
		}, [key]);

		return (
			<section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
				<div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
					<span className="text-xs font-medium">{title}</span>
					<span className="text-xs text-muted-foreground">
						{value.length.toLocaleString()} chars
					</span>
				</div>
				<div className="min-h-0 flex-1">
					<Editor
						height="100%"
						theme="vs-dark"
						language={language}
						value={value}
						onChange={(next) => onChange?.(next ?? "")}
						beforeMount={ensurePropertiesLanguage}
						onMount={handleMount}
						loading={
							<span className="p-3 text-xs text-muted-foreground">
								Loading editor…
							</span>
						}
						options={{
							readOnly,
							fontSize,
							fontFamily: "'JetBrains Mono', monospace",
							fontWeight: "400",
							fontLigatures: true,
							wordWrap: wordWrap ? "on" : "off",
							lineNumbers: "on",
							minimap: { enabled: false },
							scrollBeyondLastLine: false,
							automaticLayout: true,
							tabSize: 2,
							renderLineHighlight: "none",
							padding: { top: 8, bottom: 8 },
							fixedOverflowWidgets: true,
							unicodeHighlight: { ambiguousCharacters: false },
						}}
					/>
				</div>
			</section>
		);
	}
);
