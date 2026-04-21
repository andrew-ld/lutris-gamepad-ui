const fs = require("node:fs");
const path = require("node:path");

const localeDir = path.join(__dirname, "src_frontend/locale");
const localeFiles = fs.existsSync(localeDir) ? fs.readdirSync(localeDir) : [];

const electronLanguages = localeFiles
  .filter((f) => f.startsWith("locale.") && f.endsWith(".json"))
  .map((f) => f.split(".")[1]);

electronLanguages.push("en-US");

module.exports = {
  appId: "com.electron.${name}",
  productName: "lutris gamepad ui",
  electronLanguages: electronLanguages,
  beforeBuild: path.join(__dirname, "electron-builder.beforebuild.cjs"),
  afterPack: path.join(__dirname, "electron-builder.afterpack.cjs"),
  toolsets: {
    appimage: "1.0.2",
  },
  files: [
    "dist/**/*",
    "electron.cjs",
    "electron_preload.cjs",
    "package.json",
    "lutris_wrapper.sh",
    "lutris_wrapper.py",
    "controller_helper.py",
    "src_backend/**/*",
    "!node_modules/**/{test,tests,example,examples,doc,docs}/**/*",
  ],
  asarUnpack: [
    "lutris_wrapper.sh",
    "lutris_wrapper.py",
    "controller_helper.py",
    "electron_preload.cjs",
    "src_backend/resources/gamecontrollerdb.txt",
  ],
  directories: { output: "release" },
  linux: {
    target: "AppImage",
    category: "game",
    icon: "src_frontend/resources/icon.svg",
  },
};
