import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "./workers/editor.worker?worker";
import jsonWorker from "./workers/json.worker?worker";

let configured = false;
let menuThemeRelayInstalled = false;

/**
 * Monaco 0.57 renders its context menu inside a shadow root
 * (`.shadow-root-host` with `:host { all: initial }`, appended to the focused
 * editor's container DOM node) and declares the theme's `--vscode-*` CSS
 * variables only on `.monaco-editor` elements in the light DOM. Document
 * stylesheets cannot style inside another shadow tree, so inside the menu's
 * shadow root the variables resolve to nothing: the menu paints transparent
 * with inherited text color. Relay Monaco's own generated variable
 * declarations into each menu shadow root so the built-in `vs-dark` theme
 * styles the menu, for both editor instances, with no custom palette.
 */
function relayMonacoThemeIntoMenuShadowRoot(): void {
	if (menuThemeRelayInstalled || typeof document === "undefined") {
		return;
	}
	menuThemeRelayInstalled = true;

	const injected = new WeakSet<ShadowRoot>();

	const inject = (node: Element): void => {
		if (
			node.classList.contains("shadow-root-host") &&
			node instanceof HTMLElement &&
			node.shadowRoot
		) {
			injectMonacoThemeVariables(node.shadowRoot, injected);
		}
	};

	const install = () => {
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (!(node instanceof HTMLElement)) continue;
					// The host itself, or a subtree containing it (the host is
					// appended to the focused editor's container DOM node).
					inject(node);
					for (const host of Array.from(
						node.querySelectorAll<HTMLElement>(".shadow-root-host")
					)) {
						inject(host);
					}
				}
			}
		});
		// Hosts appear anywhere in the layout, so watch the whole document.
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
		// A menu may already be open.
		for (const host of Array.from(
			document.querySelectorAll<HTMLElement>(".shadow-root-host")
		)) {
			inject(host);
		}
	};

	if (document.body) {
		install();
	} else {
		document.addEventListener("DOMContentLoaded", install, { once: true });
	}
}

function collectMonacoThemeVariables(): string | null {
	const variables = new Map<string, string>();
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			continue;
		}
		for (const rule of Array.from(rules)) {
			if (!(rule instanceof CSSStyleRule)) continue;
			const { selectorText } = rule;
			if (
				!selectorText ||
				(!selectorText.includes(".monaco-editor") &&
					!selectorText.includes(".monaco-diff-editor") &&
					!selectorText.includes(".monaco-component"))
			) {
				continue;
			}
			const { style } = rule;
			for (let i = 0; i < style.length; i += 1) {
				const name = style[i];
				if (name.startsWith("--")) {
					variables.set(name, style.getPropertyValue(name));
				}
			}
		}
	}
	if (variables.size === 0) {
		return null;
	}
	return Array.from(variables, ([name, value]) => `${name}:${value}`).join(";");
}

function injectMonacoThemeVariables(
	root: ShadowRoot,
	injected: WeakSet<ShadowRoot>
): void {
	if (injected.has(root)) {
		return;
	}
	const variables = collectMonacoThemeVariables();
	if (!variables) {
		return;
	}

	// `:host` styles the shadow root's host element; custom properties declared
	// there inherit into the menu rendered inside the shadow tree. (`:root`
	// does not match anywhere inside a shadow tree.)
	const style = document.createElement("style");
	style.textContent = `:host{${variables}}`;
	root.prepend(style);
	injected.add(root);
}

/**
 * Bundles Monaco locally (no CDN): registers web workers and hands the
 * already-imported monaco namespace to @monaco-editor/react's loader.
 * Monoco has no built-in "properties" language; ensurePropertiesLanguage
 * registers a small monarch tokenizer for .properties files exactly once.
 */
function configureMonaco(): void {
	if (configured) {
		return;
	}
	configured = true;

	(globalThis as { MonacoEnvironment?: monaco.Environment }).MonacoEnvironment =
		{
			getWorker(_workerId: string, label: string): Worker {
				if (label === "json") {
					return new jsonWorker();
				}
				return new editorWorker();
			},
		};

	loader.config({ monaco });
	relayMonacoThemeIntoMenuShadowRoot();
}

configureMonaco();

export function ensurePropertiesLanguage(editorMonaco: typeof monaco): void {
	if (
		editorMonaco.languages
			.getLanguages()
			.some((entry) => entry.id === "properties")
	) {
		return;
	}

	editorMonaco.languages.register({
		id: "properties",
		aliases: ["Properties", "properties"],
		extensions: [".properties"],
	});

	editorMonaco.languages.setMonarchTokensProvider("properties", {
		ignoreCase: true,
		tokenizer: {
			root: [
				// Comments start with # or !
				[/^\s*[#!].*$/, "comment"],
				// Key: text before the first = or : delimiter
				[/^[^=:]+(?=[=:])/, "variable"],
				// Delimiters
				[/[=:]/, "delimiter"],
			],
		},
	});
}
