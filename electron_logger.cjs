const path = require("path");
const { app } = require("electron");
const util = require("util");
const fs = require("fs");

/** @type {fs.WriteStream | null} */
let logStream = undefined;

const levelToConsoleMethod = {
  INFO: console.log,
  WARN: console.warn,
  ERROR: console.error,
};

function initialize() {
  if (logStream !== undefined) {
    return;
  }

  try {
    const appName = app.getName();
    const logDir = path.join(app.getPath("home"), ".local", appName, "logs");
    fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, "app.log");
    logStream = fs.createWriteStream(logFile, { flags: "w" });
  } catch (error) {
    logStream = null;
    console.error(
      "Failed to initialize file logger. Logging will only be sent to the console.",
      error
    );
  }
}

const writeLog = (level, ...args) => {
  initialize();

  const timestamp = new Date().toISOString();
  const message = util.format(args);
  const formattedMessage = `[${timestamp}] [${level}] ${message}`;

  const consoleMethod = levelToConsoleMethod[level] || console.log;
  consoleMethod(`[${timestamp}] [${level}]`, ...args);

  if (logStream && logStream.writable) {
    logStream.write(formattedMessage + "\n", (err) => {
      if (err) {
        console.error("Failed to write to log file:", err);
        logStream = null;
      }
    });
  }
};

const logger = {
  info: (...args) => writeLog("INFO", ...args),
  warn: (...args) => writeLog("WARN", ...args),
  error: (...args) => writeLog("ERROR", ...args),
};

module.exports = logger;
