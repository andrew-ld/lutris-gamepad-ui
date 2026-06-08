const { getAppConfig } = require("./config_manager.cjs");
const {
  execPromise,
  logWarn,
  logError,
  execFilePromise,
} = require("./utils.cjs");

const VALID_SUSPEND_MODE_OPTIONS = new Set([
  "sleep",
  "hybrid-sleep",
  "suspend-then-hibernate",
  "hibernate",
]);

async function suspendPc() {
  const mode = getAppConfig().systemPowerSuspendMode;

  if (!VALID_SUSPEND_MODE_OPTIONS.has(mode)) {
    logWarn("requested suspend pc, but currect mode is invalid", mode);
    return;
  }

  await execFilePromise("systemctl", [mode]);
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

module.exports = {
  suspendPc,
  powerOffPc,
  rebootPc,
};
