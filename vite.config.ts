import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react({
			jsxRuntime: "automatic",
		}),
		tailwindcss(),
	],
	base: "/fast-smallcap/",
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "./src"),
		},
	},
	// Playwright e2e specs run via `npx playwright test`, not vitest.
	test: {
		exclude: ["**/node_modules/**", "tests/**"],
	},
});
