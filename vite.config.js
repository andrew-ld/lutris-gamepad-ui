import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

import { createLocalePlugins } from "./vite-plugin-locale.js";

const { babelPlugin: babelLocalePlugin, vitePlugin: viteLocalePlugin } =
  createLocalePlugins();

export default defineConfig({
  base: "",
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    },
  },
  plugins: [
    preact({
      babel: {
        plugins: [babelLocalePlugin],
      },
    }),
    viteLocalePlugin,
  ],
});
