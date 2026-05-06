import css from "@eslint/css";
import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import importX from "eslint-plugin-import-x";
import promise from "eslint-plugin-promise";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["dist/**", "node_modules/**", "release/**", "index.html"],
  },

  {
    files: ["src_frontend/styles/**/*.css"],
    language: "css/css",
    plugins: { css },
    rules: {
      ...css.configs.recommended.rules,
      "css/no-important": "off",
      "css/no-invalid-properties": "off",
    },
  },

  {
    ...eslintReact.configs.recommended,
    files: ["src_frontend/**/*.{js,jsx}"],
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
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importX,
      promise,
      unicorn,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...promise.configs["flat/recommended"].rules,
      ...unicorn.configs["recommended"].rules,

      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-null": "off",
      "unicorn/filename-case": "off",
      "unicorn/no-array-reduce": "error",
      "promise/always-return": "off",
      "unicorn/prefer-ternary": "off",
      "unicorn/number-literal-case": "off",
      "@eslint-react/naming-convention-ref-name": "off",
      "@eslint-react/no-context-provider": "off",
      "@eslint-react/no-forward-ref": "off",
      "@eslint-react/no-use-context": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
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
    rules: {
      "unicorn/prefer-module": "off",
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
