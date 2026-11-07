import { Badge } from "@/components/ui/badge";
import { getFormatLabel } from "@/lib/file-utils";
import type { SyntaxValidation } from "@/lib/validation";
import type { ConversionStatus, FileFormat } from "@/types";

type StatusBarProps = {
	fileName: string | null;
	format: FileFormat | null;
	charCount: number;
	status: ConversionStatus;
	validation: SyntaxValidation | null;
	error: string | null;
};

const STATUS_TEXT: Record<ConversionStatus, string> = {
	idle: "Ready",
	converting: "Converting…",
	converted: "Converted",
};

export function StatusBar({
	fileName,
	format,
	charCount,
	status,
	validation,
	error,
}: StatusBarProps) {
	return (
		<footer className="flex h-9 shrink-0 items-center gap-4 border-t px-4 text-xs text-muted-foreground">
			<Badge variant="secondary">{getFormatLabel(format)}</Badge>
			<span className="max-w-40 truncate" title={fileName ?? undefined}>
				{fileName ?? "No file"}
			</span>
			<span>{charCount.toLocaleString()} characters</span>
			<span className={status === "converted" ? "text-primary" : undefined}>
				{STATUS_TEXT[status]}
			</span>
			{validation === null || validation.result === "unknown" ? null : (
				<span
					className={
						validation.result === "valid"
							? "text-primary"
							: "truncate text-destructive"
					}
					title={
						validation.result === "invalid" ? validation.message : undefined
					}
				>
					{validation.result === "valid"
						? "Syntax valid"
						: `Syntax error${validation.line === undefined ? "" : ` on line ${validation.line}`}`}
				</span>
			)}
			{error === null ? null : (
				<span className="ml-auto truncate text-destructive" title={error}>
					{error}
				</span>
			)}
		</footer>
	);
}
