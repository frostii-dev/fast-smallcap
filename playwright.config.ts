import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	timeout: 120000,
	use: {
		baseURL: "http://localhost:4173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		actionTimeout: 60000,
		navigationTimeout: 60000,
		permissions: ["clipboard-read", "clipboard-write"],
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run preview",
		url: "http://localhost:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
});
