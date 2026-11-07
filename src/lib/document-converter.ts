import {
	parseAllDocuments,
	isMap,
	isPair,
	isScalar,
	isSeq,
	type Scalar,
} from "yaml";
import type { AnyNode as MomoaNode } from "@humanwhocodes/momoa";
import { parse as parseJsonDocument } from "@humanwhocodes/momoa";
import {
	Pair as propertiesPair,
	parseLines as parsePropertiesLines,
} from "dot-properties";
import { convertToSmallCaps } from "./converter";
import type { ProtectionConfig } from "./protection-config";
import type { FileFormat } from "@/types";
import { DEFAULT_PROTECTION_CONFIG } from "./protection-config";

/**
 * Format-aware conversion: identify the actual string-value source ranges
 * first, then convert only those ranges.
 *
 * - YAML (`yaml` package AST with source ranges): values of string type
 *   only — mapping keys, numeric/boolean/null scalars, aliases and comments
 *   are never touched. Quoted scalars are converted between their quotes;
 *   block scalars skip the `|`/`>` header line.
 * - JSON (`@humanwhocodes/momoa` AST with offsets): string values only —
 *   property names (keys), numbers, booleans, null are never touched.
 * - Properties: `dot-properties` AST in `parseLines(src, true)` mode, which
 *   exposes `Pair.range = [keyStart, keyEnd, valueStart, valueEnd]` with raw
 *   source offsets (escaped separators, whitespace separators and multiline
 *   continuations handled by the library). Keys and comments are separate
 *   nodes and are never touched; values go through the same
 *   protected-pattern conversion (placeholders, Minecraft codes, hex).
 *
 * Documents are never re-serialized: all formatting outside the scalar
 * value ranges survives byte for byte. Invalid YAML/JSON produces an error
 * result instead of a silently modified document.
 */

export type ConvertDocumentOptions = {
	/**
	 * Properties files only: when enabled (default), values that are plain
	 * numeric/boolean/null literals are left unchanged. Every other value is
	 * treated as a string.
	 */
	textualOnly: boolean;
	/**
	 * Configuration for which protection rules are active.
	 * Defaults to all protections enabled.
	 */
	protectionConfig?: ProtectionConfig;
};

export type ConvertDocumentResult = {
	output: string;
	error: string | null;
};

export function convertDocument(
	text: string,
	format: FileFormat,
	options: ConvertDocumentOptions
): ConvertDocumentResult {
	const protectionConfig =
		options.protectionConfig ?? DEFAULT_PROTECTION_CONFIG;

	if (format === "yaml") {
		return convertYamlDocument(text, protectionConfig);
	}
	if (format === "json") {
		return convertJsonDocument(text, protectionConfig);
	}
	return convertPropertiesDocument(text, options.textualOnly, protectionConfig);
}

/** Replaces each range with its converted version, copying everything else. */
function applyRanges(
	text: string,
	ranges: Array<[number, number]>,
	protectionConfig: ProtectionConfig
): string {
	if (ranges.length === 0) {
		return text;
	}
	ranges.sort((a, b) => a[0] - b[0]);
	let result = "";
	let cursor = 0;
	for (const [start, end] of ranges) {
		if (end <= start) {
			continue;
		}
		result += text.slice(cursor, start);
		result += convertToSmallCaps(text.slice(start, end), protectionConfig);
		cursor = end;
	}
	result += text.slice(cursor);
	return result;
}

function convertYamlDocument(
	text: string,
	protectionConfig: ProtectionConfig
): ConvertDocumentResult {
	let documents;
	try {
		documents = parseAllDocuments(text);
	} catch (error) {
		return { output: "", error: errorMessage(error) };
	}
	for (const document of documents) {
		if (document.errors.length > 0) {
			return { output: "", error: document.errors[0].message };
		}
	}
	const ranges: Array<[number, number]> = [];
	for (const document of documents) {
		visitYamlNode(text, document.contents, ranges);
	}

	return {
		output: applyRanges(text, ranges, protectionConfig),
		error: null,
	};
}

function visitYamlNode(
	text: string,
	content: unknown,
	ranges: Array<[number, number]>
): void {
	if (isPair(content)) {
		// Mapping keys are identifiers: never convert them, even if nested.
		if (content.value !== null) {
			visitYamlNode(text, content.value, ranges);
		}
		return;
	}
	if (isScalar(content)) {
		if (typeof content.value === "string") {
			collectYamlScalarRange(text, content, ranges);
		}
		return;
	}
	if (isMap(content) || isSeq(content)) {
		for (const item of content.items) {
			visitYamlNode(text, item, ranges);
		}
	}
	// Alias nodes are references to anchors: never converted.
}

function collectYamlScalarRange(
	text: string,
	scalar: Scalar,
	ranges: Array<[number, number]>
): void {
	const range = scalar.range;
	if (range === null || range === undefined) {
		return;
	}
	const [start, mid, end] = range;
	if (scalar.type === "QUOTE_DOUBLE" || scalar.type === "QUOTE_SINGLE") {
		// Source spans both quotes: convert only the content between them.
		ranges.push([start + 1, mid - 1]);
		return;
	}
	if (scalar.type === "BLOCK_LITERAL" || scalar.type === "BLOCK_FOLDED") {
		// Source spans the |/> header line: content starts on the next line.
		const headerEnd = text.indexOf("\n", start);
		if (headerEnd === -1) {
			return;
		}
		ranges.push([headerEnd + 1, end]);
		return;
	}
	// Plain scalars: range starts after anchor/tag prefixes and stops before
	// any trailing comment.
	ranges.push([start, mid]);
}

function convertJsonDocument(
	text: string,
	protectionConfig: ProtectionConfig
): ConvertDocumentResult {
	let ast: MomoaNode;
	try {
		ast = parseJsonDocument(text, { mode: "json" });
	} catch (error) {
		return { output: "", error: errorMessage(error) };
	}
	const ranges: Array<[number, number]> = [];
	visitJsonNode(ast, ranges);

	return {
		output: applyRanges(text, ranges, protectionConfig),
		error: null,
	};
}

function visitJsonNode(node: MomoaNode, ranges: Array<[number, number]>): void {
	switch (node.type) {
		case "Document": {
			visitJsonNode(node.body, ranges);
			return;
		}
		case "Object": {
			// Member names are property keys: only visit the values.
			for (const member of node.members) {
				visitJsonNode(member.value, ranges);
			}
			return;
		}
		case "Array": {
			for (const element of node.elements) {
				visitJsonNode(element.value, ranges);
			}
			return;
		}
		case "String": {
			// loc offsets span the opening and closing quotes.
			const start = node.loc.start.offset;
			const end = node.loc.end.offset;
			ranges.push([start + 1, end - 1]);
			return;
		}
		default:
			// Numbers, booleans, null and every other token are structural.
			return;
	}
}

function convertPropertiesDocument(
	text: string,
	textualOnly: boolean,
	protectionConfig: ProtectionConfig
): ConvertDocumentResult {
	// dot-properties (by the yaml package's maintainer) provides an AST with
	// source offsets: Pair.range = [keyStart, keyEnd, valueStart, valueEnd].
	// The value span covers raw source text (continuations included), which is
	// exactly the range to convert; keys, comments and empty lines are
	// separate nodes and are never touched.
	const ranges: Array<[number, number]> = [];
	try {
		for (const node of parsePropertiesLines(text, true)) {
			if (!(node instanceof propertiesPair)) {
				continue;
			}
			const valueStart = node.range[2];
			const valueEnd = node.range[3];
			if (valueEnd <= valueStart) {
				continue;
			}
			if (textualOnly && isPropertiesLiteralValue(node.value)) {
				continue;
			}
			ranges.push([valueStart, valueEnd]);
		}
	} catch (error) {
		return { output: "", error: errorMessage(error) };
	}

	return {
		output: applyRanges(text, ranges, protectionConfig),
		error: null,
	};
}

function isPropertiesLiteralValue(unescapedValue: string): boolean {
	const candidate = unescapedValue.trim();
	return (
		/^-?\d+(\.\d+)?$/.test(candidate) || /^(true|false|null)$/i.test(candidate)
	);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
