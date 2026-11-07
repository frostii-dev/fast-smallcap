import { describe, expect, it } from "vitest";
import { validateSyntax } from "./validation";

describe("validateSyntax", () => {
	it("reports valid YAML documents", () => {
		const yaml = `items:
  sword:
    name: "&aIron Sword {rarity}"
    price: 100
`;
		expect(validateSyntax("yaml", yaml)).toEqual({ result: "valid" });
	});

	it("reports invalid YAML with the failing line number", () => {
		const yaml = `items:
  sword:
  name: [unclosed
  price: 100
`;
		const validation = validateSyntax("yaml", yaml);
		expect(validation.result).toBe("invalid");
		expect(validation.message).toBeTruthy();
		expect(validation.line).toBeGreaterThan(0);
	});

	it("reports valid JSON documents", () => {
		expect(
			validateSyntax("json", '{\n  "title": "&bStats",\n  "rows": 3\n}')
		).toEqual({ result: "valid" });
	});

	it("reports invalid JSON with the failing line number when available", () => {
		const validation = validateSyntax("json", '{\n  "a": 1,\n  "b": \n}');
		expect(validation.result).toBe("invalid");
		expect(validation.message).toBeTruthy();
		expect(validation.line).toBe(4);
	});

	it("maps a JSON syntax error on a later line correctly", () => {
		const validation = validateSyntax(
			"json",
			`{
  "ok": true,
  "bad": ]}`
		);
		expect(validation.result).toBe("invalid");
		expect(validation.line).toBe(3);
	});

	it("maps YAML errors after several lines", () => {
		const yaml = `a: 1
b: 2
c: "unterminated
d: 4
`;
		const validation = validateSyntax("yaml", yaml);
		expect(validation.result).toBe("invalid");
		expect(validation.message).toBeTruthy();
		expect(typeof validation.line).toBe("number");
		expect(validation.line as number).toBeGreaterThan(2);
	});

	it("treats properties files as out of scope for syntax validation", () => {
		expect(
			validateSyntax(
				"properties",
				"motd=Hello {player}\nsome-things: [anything goes?\n"
			)
		).toEqual({ result: "unknown" });
	});

	it("returns unknown when no file is loaded", () => {
		expect(validateSyntax(null, "anything")).toEqual({ result: "unknown" });
	});

	it("skips validation of oversized documents", () => {
		const big = "a: 1\n".repeat(400_000);
		const validation = validateSyntax("yaml", big);
		expect(validation).toEqual({ result: "unknown" });
	});
});
