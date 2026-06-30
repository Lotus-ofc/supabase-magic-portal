// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            const norm = id.replace(/\\/g, "/");
            if (norm.includes("/react-dom/") || /\/react\//.test(norm)) return "react-vendor";
            if (norm.includes("/@tanstack/") || norm.includes("/tanstack-")) return "tanstack";
            if (norm.includes("/@supabase/")) return "supabase";
            if (norm.includes("/@radix-ui/")) return "radix";
            if (norm.includes("/cmdk/")) return "cmdk";
            if (norm.includes("/fuse.js/")) return "fuse";
            if (norm.includes("/recharts/")) return "recharts";
            if (norm.includes("/mermaid/")) return "mermaid";
          },
        },
      },
    },
  },
});
