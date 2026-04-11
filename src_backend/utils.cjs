const { exec, execFile } = require("node:child_process");
const { existsSync } = require("node:fs");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { cwd } = require("node:process");
const { promisify } = require("node:util");

const {
  info: logInfo,
  warn: logWarn,
  error: logError,
} = require("./logger.cjs");
const { getMainWindow } = require("./state.cjs");

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

async function spawnGSettings(arguments_) {
  try {
    const { stdout } = await execFilePromise("gsettings", arguments_);
    return stdout.trim();
  } catch (error) {
    logError("gsettings error:", error);
    throw error;
  }
}

async function spawnDdcutil(arguments_) {
  try {
    const { stdout } = await execFilePromise("ddcutil", arguments_);
    return stdout.trim();
  } catch (error) {
    logError("ddcutil error:", error);
    throw error;
  }
}

const isDevelopment = process.env.LUTRIS_GAMEPAD_UI_IS_DEV === "1";
const forceWindowed = process.env.LUTRIS_GAMEPAD_UI_FORCE_WINDOWED === "1";

function localeAppFile(name) {
  const DIRECTORIES = [
    process.resourcesPath,
    path.join(process.resourcesPath, "app.asar.unpacked"),
    cwd(),
    __dirname,
    path.join(__dirname, ".."),
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

async function retryAsync(function_, options = {}) {
  const {
    maxTries = 3,
    initialDelay = 200,
    maxDelay = 2000,
    onRetry,
  } = options;

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      return await function_();
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

const debounce = (func, wait, maxPostpones = 10) => {
  let timeout;
  let postpones = 0;

  let lastContext;
  let lastArgs;

  const later = () => {
    timeout = null;
    postpones = 0;
    func.apply(lastContext, lastArgs);
  };

  return function (...args) {
    lastContext = globalThis;
    lastArgs = args;

    clearTimeout(timeout);
    postpones += 1;

    if (postpones > maxPostpones) {
      postpones = 0;
      func.apply(lastContext, lastArgs);
    } else {
      timeout = setTimeout(later, wait);
    }
  };
};

function isRunningInsideGamescope() {
  return process.env.XDG_CURRENT_DESKTOP === "gamescope";
}

function showToastOnUi(payload) {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send("show-toast", payload);
  }
}

function errorToDescription(error) {
  let description = "An unknown error occurred.";

  if (error instanceof Error) {
    description = error.message;
  } else if (typeof error === "string") {
    description = error;
  } else if (Array.isArray(error)) {
    description = error.map((error_) => errorToDescription(error_)).join("\n");
  }

  return description;
}

function toastError(title, error) {
  const description = errorToDescription(error);

  showToastOnUi({
    title,
    description,
    type: "error",
  });
}

async function rebootPc() {
  const commands = ["systemctl reboot", "loginctl reboot", "reboot"];
  const errors = [];

  for (const command of commands) {
    try {
      await execPromise(command);
      return;
    } catch (error) {
      logError("unable to reboot pc using", command, error);
      errors.push(error);
    }
  }

  throw errors;
}

async function powerOffPc() {
  const commands = ["systemctl poweroff", "loginctl poweroff", "poweroff"];
  const errors = [];

  for (const command of commands) {
    try {
      await execPromise(command);
      return;
    } catch (error) {
      logError("unable to poweroff pc using", command, error);
      errors.push(error);
    }
  }

  throw errors;
}

function isProcessPaused(pid) {
  const statusFile = readFileSync(`/proc/${pid}/status`, "utf8");

  const processStateLine = statusFile
    .split("\n")
    .map((l) => l.split(":"))
    .find((e) => e[0] === "State");

  if (!processStateLine) {
    throw new Error("Unable to find process state in status file");
  }

  const processStateValue = processStateLine[1].trim();

  logInfo(
    "process",
    pid,
    "stateline",
    processStateLine,
    "statevalue",
    processStateValue,
  );

  return processStateValue.startsWith("T");
}

function getProcessDescendants(pid, visitedPids) {
  if (visitedPids.has(pid)) return [];
  visitedPids.add(pid);

  const childrenPath = `/proc/${pid}/task/${pid}/children`;
  try {
    const childrenContent = readFileSync(childrenPath, "utf8");
    const childPids = childrenContent
      .trim()
      .split(" ")
      .map(Number)
      .filter(Boolean);

    const descendants = childPids.flatMap((childPid) =>
      getProcessDescendants(childPid, visitedPids),
    );

    return [...childPids, ...descendants];
  } catch (error) {
    logError("Unable to read children of pid", pid, error);
    return [];
  }
}

function getRunExclusive() {
  let queue = Promise.resolve();

  const runExclusive = (function_) => {
    queue = queue.then(function_, function_);
    return queue;
  };

  return runExclusive;
}

module.exports = {
  isDev: isDevelopment,
  forceWindowed,
  execPromise,
  spawnGSettings,
  spawnDdcutil,
  getLutrisWrapperPath,
  getElectronPreloadPath,
  retryAsync,
  logInfo,
  logWarn,
  logError,
  debounce,
  showToastOnUi,
  toastError,
  isRunningInsideGamescope,
  rebootPc,
  powerOffPc,
  getProcessDescendants,
  isProcessPaused,
  getRunExclusive,
  execFilePromise,
  localeAppFile,
};
