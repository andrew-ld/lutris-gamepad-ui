const { spawn } = require("node:child_process");

const {
  getAppConfig,
  subscribeConfigValueChange,
} = require("./config_manager.cjs");
const { localeAppFile, logError, logInfo, logWarn } = require("./utils.cjs");

let helperProcess = null;
let grabbedDevice = null;

function getControllerHelperPath() {
  return localeAppFile("controller_helper.py");
}

function startXinputHelper() {
  if (helperProcess) {
    logWarn("controller_mode_manager", "xinput helper already running");
    return;
  }

  let helperPath;
  try {
    helperPath = getControllerHelperPath();
  } catch {
    logError(
      "controller_mode_manager",
      "controller_helper.py not found, cannot start xinput mode",
    );
    return;
  }

  logInfo("controller_mode_manager", "starting xinput helper");

  const proc = spawn(
    "python3",
    [helperPath, "serve", "--mode", "xinput", "--exclusive-grab"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const stdoutDecoder = new TextDecoder();
  const stderrDecoder = new TextDecoder();

  proc.stdout.on("data", (data) => {
    const text = stdoutDecoder.decode(data).trim();
    if (text) {
      logInfo("controller_mode_manager", text);
      try {
        const msg = JSON.parse(text);
        if (msg.status === "ready" && msg.vendorId && msg.productId) {
          grabbedDevice = {
            vendorId: msg.vendorId,
            productId: msg.productId,
          };
        }
      } catch {
        // not JSON, ignore
      }
    }
  });

  proc.stderr.on("data", (data) => {
    const text = stderrDecoder.decode(data).trim();
    if (text) {
      logError("controller_mode_manager", text);
    }
  });

  proc.on("close", (code) => {
    logInfo("controller_mode_manager", `xinput helper exited with code ${code}`);
    if (helperProcess === proc) {
      helperProcess = null;
      grabbedDevice = null;
    }
  });

  proc.on("error", (error) => {
    logError("controller_mode_manager", "failed to start xinput helper", error);
    if (helperProcess === proc) {
      helperProcess = null;
      grabbedDevice = null;
    }
  });

  helperProcess = proc;
}

function stopXinputHelper() {
  if (!helperProcess) {
    return;
  }

  logInfo("controller_mode_manager", "stopping xinput helper");
  helperProcess.kill("SIGTERM");
  helperProcess = null;
  grabbedDevice = null;
}

function applyInputMode(mode) {
  if (mode === "xinput") {
    startXinputHelper();
  } else {
    stopXinputHelper();
  }
}

function initControllerModeManager() {
  const config = getAppConfig();
  applyInputMode(config.controllerInputMode);

  subscribeConfigValueChange("controllerInputMode", (newMode) => {
    logInfo("controller_mode_manager", `input mode changed to: ${newMode}`);
    applyInputMode(newMode);
  });
}

function shutdownControllerModeManager() {
  stopXinputHelper();
}

function getGrabbedDevice() {
  return grabbedDevice;
}

module.exports = {
  initControllerModeManager,
  shutdownControllerModeManager,
  getGrabbedDevice,
};
