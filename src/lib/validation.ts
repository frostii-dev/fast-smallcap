import { parse } from "@humanwhocodes/momoa";
import { parseDocument } from "yaml";
import type { FileFormat } from "@/types";

/**
 * Syntax feedback for the original content. Conversion itself never parses
 * documents (it must preserve source text exactly); this only reports
 * well-formedness so invalid files are flagged instead of silently
 * misbehaving.
 *
 * - yaml: validated with the maintained `yaml` package; parse errors carry
 *   1-based line/col source locations (error.linePos).
 * - json: validated with @humanwhocodes/momoa; errors report the offending
 *   (line:column) at the end of the message.
 * - properties: line-based key/value with essentially no invalid syntax;
 *   nothing meaningful to validate.
 * - unknown: no file loaded, or the document exceeded the validation size
 *   guard.
 */
export type SyntaxValidation = {
	result: "valid" | "invalid" | "unknown";
	message?: string;
	line?: number;
};

const MAX_VALIDATION_CHARS = 1_000_000;

export function validateSyntax(
	format: FileFormat | null,
	content: string
): SyntaxValidation {
	if (format === "yaml" && content.length <= MAX_VALIDATION_CHARS) {
		return validateYaml(content);
	}
	if (format === "json" && content.length <= MAX_VALIDATION_CHARS) {
		return validateJson(content);
	}
	return { result: "unknown" };
}

function validateYaml(text: string): SyntaxValidation {
	// parseDocument collects errors instead of throwing.
	const document = parseDocument(text);
	const error = document.errors[0];
	if (error === undefined) {
		return { result: "valid" };
	}
	return {
		result: "invalid",
		message: error.message,
		line: error.linePos?.[0]?.line,
	};
}

function validateJson(text: string): SyntaxValidation {
	try {
		parse(text, { mode: "json" });
		return { result: "valid" };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const location = /\((\d+):(\d+)\)\s*$/.exec(message);
		return {
			result: "invalid",
			message,
			line: location === null ? undefined : Number(location[1]),
		};
	}
}
