const fs = require("node:fs");
const { EOL } = require("node:os");
const path = require("node:path");
const { format } = require("node:util");

const { getLogFilePath } = require("./storage.cjs");

/** @type {fs.WriteStream | null} */
let logStream;

const levelToConsoleMethod = {
  INFO: console.log,
  WARN: console.warn,
  ERROR: console.error,
};

function getCallerFilename() {
  const originalPrepareStackTrace = Error.prepareStackTrace;
  const originalStackTraceLimit = Error.stackTraceLimit;

  let callerFilename = null;

  try {
    Error.prepareStackTrace = (_err, stack) => stack;
    Error.stackTraceLimit = 3;

    // eslint-disable-next-line unicorn/error-message
    const err = new Error();

    Error.captureStackTrace(err, getCallerFilename);

    const callSite = err.stack[2];

    if (callSite) {
      callerFilename = callSite.getFileName();
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
    Error.stackTraceLimit = originalStackTraceLimit;
  }

  return callerFilename;
}

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

  let callerFilename = getCallerFilename();

  if (callerFilename) {
    callerFilename = path.parse(callerFilename).name;
  } else {
    callerFilename = "<unknown>";
  }

  const timestamp = new Date().toISOString();
  const consoleFormattedMessage = `[${timestamp}] [${level}] [${callerFilename}]`;
  const consoleMethod = levelToConsoleMethod[level] || console.log;

  consoleMethod(consoleFormattedMessage, ...arguments_);

  if (logStream && logStream.writable) {
    const fileFormattedMessage = `${consoleFormattedMessage} ${format(...arguments_)}${EOL}`;

    logStream.write(fileFormattedMessage, (error) => {
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
