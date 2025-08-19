const util = require("util");
const { getLogFilePath } = require("./storage.cjs");
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
    logStream = fs.createWriteStream(getLogFilePath(), { flags: "w" });
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
    logStream.write(formattedMessage + "\n\r", (err) => {
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
