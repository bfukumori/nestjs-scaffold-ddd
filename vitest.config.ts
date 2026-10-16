import { resolve } from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		swc.vite({
			module: { type: "es6" },
		}),
	],
	test: {
		globals: true,
		root: "./",
		include: ["**/*.spec.ts"],
		env: {
			JWT_SECRET: "test-jwt-secret-for-vitest-environment-suite-32chars",
		},
		alias: {
			src: resolve(import.meta.dirname, "./src"),
		},
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/main.ts", "**/*.spec.ts", "**/*.d.ts"],
		},
	},
	resolve: {
		tsconfigPaths: true,
		alias: {
			src: resolve(import.meta.dirname, "./src"),
		},
	},
});
