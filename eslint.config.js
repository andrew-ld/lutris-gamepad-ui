import js from "@eslint/js";
import importX from "eslint-plugin-import-x";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["dist/**", "node_modules/**", "release/**", "index.html"],
  },
  {
    // Global settings for all JS/JSX files
    files: ["**/*.{js,jsx,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importX,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react/prop-types": "off",
      "import/order": [
        "warn",
        {
          groups: [
            "builtin", // Node.js built-ins (fs, path, etc)
            "external", // npm packages
            "internal", // Aliased paths
            "parent", // ../ paths
            "sibling", // ./ paths
            "index", // ./index paths
            "object",
            "type",
          ],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/no-duplicates": "error",
      "import/first": "error",
      "import/newline-after-import": "error",
    },
  },
  {
    // Backend Specific: Node.js globals only
    files: [
      "src_backend/**/*.cjs",
      "vite-plugin-locale.js",
      "vite.config.js",
      "*.cjs",
    ],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.electron,
      },
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
  {
    // Frontend Specific: Browser globals only
    files: ["src_frontend/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["src_frontend/contexts/**/*.{js,jsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
];
