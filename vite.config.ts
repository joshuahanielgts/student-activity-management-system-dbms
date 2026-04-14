import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => {
	const isVercelBuild =
		process.env.VERCEL === "1" || process.env.npm_lifecycle_event === "build:vercel";

	return {
		plugins: [
			tsConfigPaths({
				projects: ["./tsconfig.json"],
			}),
			tailwindcss(),
			tanstackStart({
				customViteReactPlugin: true,
				spa: isVercelBuild
					? {
						enabled: true,
						maskPath: "/",
						prerender: {
							outputPath: "/_shell",
						},
					}
					: undefined,
			}),
			react(),
			command === "build" && !isVercelBuild ? cloudflare() : null,
		].filter(Boolean),
		optimizeDeps: {
			exclude: [
				"@tanstack/react-start",
				"@tanstack/react-start/server-entry",
				"@tanstack/start-server-core",
			],
		},
	};
});
