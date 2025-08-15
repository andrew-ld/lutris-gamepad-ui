const { exec } = require("child_process");
const { promisify } = require("util");
const { existsSync } = require("fs");
const path = require("node:path");
const { cwd } = require("node:process");

const {
  info: logInfo,
  warn: logWarn,
  error: logError,
} = require("./logger.cjs");

const execPromise = promisify(exec);

const isDev = process.env.IS_DEV === "1";
const forceWindowed = process.env.FORCE_WINDOWED === "1";

function localeAppFile(name) {
  const DIRECTORIES = [
    cwd(),
    __dirname,
    path.join(__dirname, ".."),
    process.resourcesPath,
    path.join(process.resourcesPath, "app.asar.unpacked"),
  ];

  for (const directory of DIRECTORIES) {
    const absolutePath = path.join(directory, name);
    if (existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  return new Error("unable to find: " + name);
}

function getLutrisWrapperPath() {
  return localeAppFile("lutris_wrapper.sh");
}

function getElectronPreloadPath() {
  return localeAppFile("electron_preload.cjs");
}

module.exports = {
  isDev,
  forceWindowed,
  execPromise,
  getLutrisWrapperPath,
  getElectronPreloadPath,
  logInfo,
  logWarn,
  logError,
};
