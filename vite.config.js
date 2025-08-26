import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createLocalePlugins } from "./vite-plugin-locale.js";

const { babelPlugin: babelLocalePlugin, vitePlugin: viteLocalePlugin } =
  createLocalePlugins();

export default defineConfig({
  base: "",
  plugins: [
    react({
      babel: {
        plugins: [babelLocalePlugin],
      },
    }),
    viteLocalePlugin,
  ],
});
