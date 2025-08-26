import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path, { relative } from "path";
import { fileURLToPath } from "url";
import * as babel from "@babel/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sortLocaleObject(localeObj) {
  const sortedObj = {};
  const sortedNamespaces = Object.keys(localeObj).sort();

  for (const namespace of sortedNamespaces) {
    const keys = localeObj[namespace];
    const sortedKeys = {};
    Object.keys(keys)
      .sort()
      .forEach((key) => {
        sortedKeys[key] = keys[key];
      });
    sortedObj[namespace] = sortedKeys;
  }
  return sortedObj;
}

export function createLocalePlugins() {
  const pluginState = {
    translationKeysByFile: new Map(),
    frontendSrcDir: path.resolve(__dirname, "src_frontend"),
    masterLocaleFile: path.resolve(
      __dirname,
      "src_frontend/locale/locale.en.json"
    ),
    viteServer: null,
  };

  function generateMasterLocaleObject() {
    const masterObject = {};
    const sortedFilenames = Array.from(
      pluginState.translationKeysByFile.keys()
    ).sort();

    for (const absoluteFilename of sortedFilenames) {
      const keysSet = pluginState.translationKeysByFile.get(absoluteFilename);
      if (!keysSet || keysSet.size === 0) continue;

      const relativeFilename = path.relative(
        pluginState.frontendSrcDir,
        absoluteFilename
      );

      const sortedKeys = Array.from(keysSet).sort();

      masterObject[relativeFilename] = Object.fromEntries(
        sortedKeys.map((key) => [key, key])
      );
    }

    return masterObject;
  }

  function writeLocaleFile(localeObject, filename) {
    writeFileSync(
      filename,
      JSON.stringify(sortLocaleObject(localeObject), null, 2) + "\n"
    );
  }

  function updateAllLocaleFiles() {
    const masterLocaleObject = generateMasterLocaleObject();
    writeLocaleFile(masterLocaleObject, pluginState.masterLocaleFile);

    const localeDir = path.dirname(pluginState.masterLocaleFile);

    const allLocaleFilePaths = readdirSync(localeDir)
      .filter(
        (file) =>
          file.startsWith("locale.") &&
          file.endsWith(".json") &&
          file !== path.basename(pluginState.masterLocaleFile)
      )
      .map((file) => path.join(localeDir, file));

    for (const localeFilePath of allLocaleFilePaths) {
      const currentContent = JSON.parse(readFileSync(localeFilePath, "utf-8"));

      const combinedContent = {};
      const allNamespaces = new Set([
        ...Object.keys(masterLocaleObject),
        ...Object.keys(currentContent),
      ]);

      for (const namespace of allNamespaces) {
        const masterKeys = masterLocaleObject[namespace] || {};
        const currentKeys = currentContent[namespace] || {};
        const allKeys = new Set([
          ...Object.keys(masterKeys),
          ...Object.keys(currentKeys),
        ]);

        combinedContent[namespace] = {};

        for (const key of allKeys) {
          if (Object.hasOwn(currentKeys, key)) {
            combinedContent[namespace][key] = currentKeys[key];
          } else {
            combinedContent[namespace][key] = key;
          }
        }
      }

      writeLocaleFile(combinedContent, localeFilePath);
    }

    if (pluginState.viteServer) {
      pluginState.viteServer.ws.send({ type: "full-reload", path: "*" });
    }
  }

  const areSetsEqual = (a, b) =>
    a.size === b.size && [...a].every((value) => b.has(value));

  const babelPluginExtractAndTransform = ({ types: t }) => {
    return {
      pre() {
        this.i18nKeys = new Set();
      },
      visitor: {
        CallExpression(path, state) {
          if (!path.get("callee").isIdentifier({ name: "t" })) {
            return;
          }

          const [firstArg] = path.get("arguments");
          if (firstArg && firstArg.isStringLiteral()) {
            this.i18nKeys.add(firstArg.node.value);
          }

          const filename = state.opts.filename || state.filename;
          if (!filename) return;

          const numArgs = path.node.arguments.length;
          if (numArgs >= 3) {
            return;
          }

          const relativeFilename = relative(
            pluginState.frontendSrcDir,
            filename
          );

          if (numArgs === 1) {
            path.node.arguments.push(t.identifier("undefined"));
          }
          path.node.arguments.push(t.stringLiteral(relativeFilename));
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
          updateAllLocaleFiles();
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
      pluginState.translationKeysByFile.clear();
      try {
        const allFiles = readdirSync(pluginState.frontendSrcDir, {
          recursive: true,
          withFileTypes: true,
        });

        const filesToScan = allFiles
          .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".jsx"))
          .map((dirent) => path.join(dirent.parentPath, dirent.name));

        filesToScan.forEach((file) => {
          const content = readFileSync(file, "utf-8");
          babel.transformSync(content, {
            filename: file,
            plugins: [
              ["@babel/plugin-syntax-jsx"],
              [babelPluginExtractAndTransform],
            ],
          });
        });

        updateAllLocaleFiles();
      } catch (error) {
        console.error("[locale-plugin] Initial scan failed:", error);
      }
    },
  };

  return {
    babelPlugin: babelPluginExtractAndTransform,
    vitePlugin: vitePluginOrchestrator,
  };
}
