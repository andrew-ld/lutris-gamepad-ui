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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryAsync(fn, options = {}) {
  const {
    maxTries = 3,
    initialDelay = 200,
    maxDelay = 2000,
    onRetry,
  } = options;

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxTries) {
        throw error;
      }
      if (onRetry) {
        onRetry(error, attempt);
      }
      const delay = Math.min(initialDelay * 2 ** (attempt - 1), maxDelay);
      await sleep(delay);
    }
  }
}

module.exports = {
  isDev,
  forceWindowed,
  execPromise,
  getLutrisWrapperPath,
  getElectronPreloadPath,
  retryAsync,
  logInfo,
  logWarn,
  logError,
};
