import type { FileFormat } from "@/types";

export const ACCEPTED_EXTENSIONS = ".yaml,.yml,.json,.properties";

const FORMAT_LABELS: Record<FileFormat, string> = {
	yaml: "YAML",
	json: "JSON",
	properties: "Properties",
};

const FORMAT_MIME: Record<FileFormat, string> = {
	yaml: "application/x-yaml",
	json: "application/json",
	properties: "text/plain",
};

/** Detects the file format from a filename extension, or null if unsupported. */
export function getFormatFromName(fileName: string): FileFormat | null {
	const dot = fileName.lastIndexOf(".");
	if (dot === -1) {
		return null;
	}
	const extension = fileName.slice(dot + 1).toLowerCase();
	if (extension === "yaml" || extension === "yml") {
		return "yaml";
	}
	if (extension === "json") {
		return "json";
	}
	if (extension === "properties") {
		return "properties";
	}
	return null;
}

export function getFormatLabel(format: FileFormat | null): string {
	return format === null ? "—" : FORMAT_LABELS[format];
}

/** Monaco language id for a file format. Monaco ships yaml + json; the
 * properties id is registered by our monaco setup. */
export function getMonacoLanguage(format: FileFormat | null): string {
	if (format === "yaml") {
		return "yaml";
	}
	if (format === "json") {
		return "json";
	}
	if (format === "properties") {
		return "properties";
	}
	return "plaintext";
}

export function downloadTextFile(
	fileName: string,
	content: string,
	format: FileFormat | null
): void {
	const blob = new Blob([content], {
		type: format === null ? "text/plain;charset=utf-8" : FORMAT_MIME[format],
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	URL.revokeObjectURL(url);
}
