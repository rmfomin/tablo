import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

const manifests = {
  normal: "manifest-normal.json",
  overrideless: "manifest-overrideless.json",
} as const;

function extensionManifestPlugin(buildType: keyof typeof manifests) {
  return {
    name: "tablo-extension-manifest",
    writeBundle() {
      fs.copyFileSync(
        path.resolve(__dirname, "public", manifests[buildType]),
        path.resolve(__dirname, "dist/manifest.json"),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const buildType = mode === "overrideless" ? "overrideless" : "normal";

  return {
    define: {
      __OVERRIDE_NEWTAB: JSON.stringify(buildType !== "overrideless"),
    },
    plugins: [
      svgr({
        include: "**/*.svg",
        svgrOptions: {
          svgoConfig: {
            plugins: [
              {
                name: "preset-default",
                params: { overrides: { removeViewBox: false } },
              },
            ],
          },
        },
      }),
      extensionManifestPlugin(buildType),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          newtab: path.resolve(__dirname, "newtab.html"),
          background: path.resolve(__dirname, "src/background.ts"),
        },
        output: {
          entryFileNames: "js/[name].js",
          chunkFileNames: "js/[name]-[hash].js",
          assetFileNames: (asset) =>
            asset.name?.endsWith(".css") ? "style.css" : "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});
