const fs = require("node:fs");
const { format } = require("node:util");

const { getLogFilePath } = require("./storage.cjs");

/** @type {fs.WriteStream | null} */
let logStream;

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
      error,
    );
  }
}

const writeLog = (level, ...arguments_) => {
  initialize();

  const timestamp = new Date().toISOString();
  const message = format(...arguments_);
  const formattedMessage = `[${timestamp}] [${level}] ${message}`;

  const consoleMethod = levelToConsoleMethod[level] || console.log;
  consoleMethod(`[${timestamp}] [${level}]`, ...arguments_);

  if (logStream && logStream.writable) {
    logStream.write(formattedMessage + "\n\r", (error) => {
      if (error) {
        console.error("Failed to write to log file:", error);
        logStream = null;
      }
    });
  }
};

const logger = {
  info: (...arguments_) => writeLog("INFO", ...arguments_),
  warn: (...arguments_) => writeLog("WARN", ...arguments_),
  error: (...arguments_) => writeLog("ERROR", ...arguments_),
};

module.exports = logger;
