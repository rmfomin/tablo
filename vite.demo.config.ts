import path from "node:path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  base: "/tablo/",
  define: { __OVERRIDE_NEWTAB: "false" },
  plugins: [
    svgr({
      include: "**/*.svg",
      svgrOptions: {
        svgoConfig: {
          plugins: [{ name: "preset-default", params: { overrides: { removeViewBox: false } } }],
        },
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    outDir: "demo-dist",
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(__dirname, "demo.html") },
  },
});
