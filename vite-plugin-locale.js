import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as babel from "@babel/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sortLocaleObject(localeObject) {
  const sortedObject = {};
  const sortedNamespaces = Object.keys(localeObject).toSorted();

  for (const namespace of sortedNamespaces) {
    const keys = localeObject[namespace];
    const sortedKeys = {};
    for (const key of Object.keys(keys).toSorted()) {
      sortedKeys[key] = keys[key];
    }
    sortedObject[namespace] = sortedKeys;
  }
  return sortedObject;
}

function writeLocaleFile(localeObject, filename) {
  writeFileSync(
    filename,
    JSON.stringify(sortLocaleObject(localeObject), null, 2) + "\n",
  );
}

const areSetsEqual = (a, b) =>
  a.size === b.size && [...a].every((value) => b.has(value));

export function createLocalePlugins() {
  const pluginState = {
    translationKeysByFile: new Map(),
    frontendSrcDir: path.resolve(__dirname, "src_frontend"),
    masterLocaleFile: path.resolve(
      __dirname,
      "src_frontend/locale/locale.en.json",
    ),
    viteServer: null,
    isInitialScan: false,
  };

  function generateMasterLocaleObject() {
    const masterObject = {};
    const sortedFilenames = [
      ...pluginState.translationKeysByFile.keys(),
    ].toSorted();

    for (const absoluteFilename of sortedFilenames) {
      const keysSet = pluginState.translationKeysByFile.get(absoluteFilename);
      if (!keysSet || keysSet.size === 0) continue;

      const relativeFilename = path.relative(
        pluginState.frontendSrcDir,
        absoluteFilename,
      );

      const sortedKeys = [...keysSet].toSorted();

      masterObject[relativeFilename] = Object.fromEntries(
        sortedKeys.map((key) => [key, key]),
      );
    }

    return masterObject;
  }

  function updateAllLocaleFiles() {
    const masterLocaleObject = generateMasterLocaleObject();
    writeLocaleFile(masterLocaleObject, pluginState.masterLocaleFile);

    const shouldCleanup =
      process.env.LUTRIS_GAMEPAD_UI_LOCALE_CLEANUP === "true";

    const localeDir = path.dirname(pluginState.masterLocaleFile);

    const allLocaleFilePaths = readdirSync(localeDir)
      .filter(
        (file) =>
          file.startsWith("locale.") &&
          file.endsWith(".json") &&
          file !== path.basename(pluginState.masterLocaleFile),
      )
      .map((file) => path.join(localeDir, file));

    for (const localeFilePath of allLocaleFilePaths) {
      const currentContent = JSON.parse(readFileSync(localeFilePath, "utf8"));

      const combinedContent = {};
      const allNamespaces = shouldCleanup
        ? Object.keys(masterLocaleObject)
        : new Set([
            ...Object.keys(masterLocaleObject),
            ...Object.keys(currentContent),
          ]);

      for (const namespace of allNamespaces) {
        const masterKeys = masterLocaleObject[namespace] || {};
        const currentKeys = currentContent[namespace] || {};
        const allKeys = shouldCleanup
          ? Object.keys(masterKeys)
          : new Set([...Object.keys(masterKeys), ...Object.keys(currentKeys)]);

        const namespaceContent = {};

        for (const key of allKeys) {
          namespaceContent[key] = Object.hasOwn(currentKeys, key)
            ? currentKeys[key]
            : key;
        }

        if (Object.keys(namespaceContent).length > 0) {
          combinedContent[namespace] = namespaceContent;
        }
      }

      writeLocaleFile(combinedContent, localeFilePath);
    }

    if (pluginState.viteServer) {
      pluginState.viteServer.ws.send({ type: "full-reload", path: "*" });
    }
  }

  const babelPluginExtractAndTransform = ({ types: t }) => {
    return {
      pre() {
        this.i18nKeys = new Set();
      },
      visitor: {
        CallExpression(nodePath, state) {
          if (!nodePath.get("callee").isIdentifier({ name: "t" })) {
            return;
          }

          const [firstArgument] = nodePath.get("arguments");
          if (firstArgument && firstArgument.isStringLiteral()) {
            this.i18nKeys.add(firstArgument.node.value);
          }

          const filename = state.opts.filename || state.filename;
          if (!filename) return;

          const numberArguments = nodePath.node.arguments.length;
          if (numberArguments >= 3) {
            return;
          }

          const relativeFilename = path.relative(
            pluginState.frontendSrcDir,
            filename,
          );

          if (numberArguments === 1) {
            nodePath.node.arguments.push(t.identifier("undefined"));
          }
          nodePath.node.arguments.push(t.stringLiteral(relativeFilename));
        },
      },
      post(state) {
        const filename = state.opts.filename;
        if (!filename || !filename.startsWith(pluginState.frontendSrcDir))
          return;

        const newKeys = this.i18nKeys;
        const oldKeys = pluginState.translationKeysByFile.get(filename);

        if (!oldKeys || !areSetsEqual(newKeys, oldKeys)) {
          if (newKeys.size > 0) {
            pluginState.translationKeysByFile.set(filename, newKeys);
          } else {
            pluginState.translationKeysByFile.delete(filename);
          }

          if (!pluginState.isInitialScan) {
            updateAllLocaleFiles();
          }
        }
      },
    };
  };

  const vitePluginOrchestrator = {
    name: "vite-plugin-locale-orchestrator",
    configureServer(server) {
      pluginState.viteServer = server;
    },
    buildStart() {
      pluginState.isInitialScan = true;
      pluginState.translationKeysByFile.clear();
      try {
        const allFiles = readdirSync(pluginState.frontendSrcDir, {
          recursive: true,
          withFileTypes: true,
        });

        const filesToScan = allFiles
          .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".jsx"))
          .map((dirent) => path.join(dirent.parentPath, dirent.name));

        for (const file of filesToScan) {
          const content = readFileSync(file, "utf8");
          babel.transformSync(content, {
            filename: file,
            plugins: [
              ["@babel/plugin-syntax-jsx"],
              [babelPluginExtractAndTransform],
            ],
          });
        }

        pluginState.isInitialScan = false;
        updateAllLocaleFiles();
      } catch (error) {
        pluginState.isInitialScan = false;
        console.error("[locale-plugin] Initial scan failed:", error);
      }
    },
  };

  return {
    babelPlugin: babelPluginExtractAndTransform,
    vitePlugin: vitePluginOrchestrator,
  };
}
