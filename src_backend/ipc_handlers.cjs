const { ipcMain, shell, nativeImage } = require("electron");
const { exec } = require("child_process");
const {
  getAudioInfo,
  setAudioVolume,
  setDefaultSink,
  setAudioMute,
} = require("./audio_manager.cjs");
const {
  getGames,
  launchGame,
  closeRunningGameProcess,
} = require("./game_manager.cjs");
const {
  getBluetoothState,
  powerOnAdapter,
  startDiscovery: bluetoothStartDiscovery,
  stopDiscovery: bluetoothStopDiscovery,
  connectToDevice: bluetoothConnect,
  disconnectFromDevice: bluetoothDisconnect,
} = require("./bluetooth_manager.cjs");
const { toggleWindowShow } = require("./window_manager.cjs");
const {
  getLutrisWrapperPath,
  logError,
  logInfo,
  logWarn,
} = require("./utils.cjs");
const { getMainWindow } = require("./state.cjs");
const { getUserTheme } = require("./theme_manager.cjs");

const logLevelToLogger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
};

const isValidDBusPath = (path, prefix) => {
  return typeof path === "string" && path.startsWith(prefix);
};

function registerIpcHandlers() {
  ipcMain.handle("get-games", getGames);

  ipcMain.on("launch-game", (_event, gameId) => {
    if (typeof gameId !== "number" || !Number.isInteger(gameId) || gameId < 0) {
      logError(
        `Invalid gameId received for launch-game: ${gameId}. Must be a non-negative integer.`
      );
      return;
    }
    launchGame(gameId);
  });

  ipcMain.on("close-game", closeRunningGameProcess);

  ipcMain.on("open-lutris", () => {
    exec(`bash ${getLutrisWrapperPath()}`, (err) => {
      if (err) logError("Open Lutris error", err);
    });
  });

  // Window & App Management
  ipcMain.on("toggle-window-show", toggleWindowShow);

  ipcMain.on("set-icon", (_event, dataURL) => {
    if (
      typeof dataURL !== "string" ||
      !dataURL.startsWith("data:image/png;base64,")
    ) {
      logError(`Invalid dataURL received for set-icon.`);
      return;
    }
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.setIcon(nativeImage.createFromDataURL(dataURL));
    }
  });

  ipcMain.on("open-external-link", (_event, url) => {
    if (typeof url !== "string") {
      logError("Invalid URL received for open-external-link: not a string.");
      return;
    }
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        logError("Attempted to open a non-HTTPS URL:", url);
        return;
      }
      shell.openExternal(url);
    } catch (e) {
      logError("Invalid URL received for open-external-link:", url, e);
    }
  });

  // System Control
  ipcMain.on("reboot-pc", () => {
    logInfo("Requesting PC reboot...");
    exec("systemctl reboot", (err) => {
      if (err) logError("Reboot error", err);
    });
  });

  ipcMain.on("poweroff-pc", () => {
    logInfo("Requesting PC power off...");
    exec("systemctl poweroff", (err) => {
      if (err) logError("Poweroff error", err);
    });
  });

  // Audio Management
  ipcMain.handle("get-audio-info", getAudioInfo);

  ipcMain.on("set-audio-volume", (_event, volume) => {
    if (typeof volume !== "number" || volume < 0) {
      logError(
        `Invalid volume received for set-audio-volume: ${volume}. Must be a non-negative number.`
      );
      return;
    }
    setAudioVolume(volume);
  });

  ipcMain.on("set-default-sink", (_event, sinkName) => {
    if (typeof sinkName !== "string" || !sinkName.length) {
      logError(
        `Invalid sinkName received for set-default-sink: ${sinkName}. Must be a non-empty string.`
      );
      return;
    }
    setDefaultSink(sinkName);
  });

  ipcMain.on("set-audio-mute", (_event, mute) => {
    if (typeof mute !== "boolean") {
      logError(
        `Invalid mute value received for set-audio-mute: ${mute}. Must be a boolean.`
      );
      return;
    }
    setAudioMute(mute);
  });

  // Bluetooth Management
  ipcMain.handle("bluetooth-get-state", getBluetoothState);

  ipcMain.on("bluetooth-power-on-adapter", (_event, adapterPath) => {
    if (!isValidDBusPath(adapterPath, "/org/bluez/")) {
      logError(
        `Invalid adapterPath for bluetooth-power-on-adapter: ${adapterPath}`
      );
      return;
    }
    powerOnAdapter(adapterPath);
  });

  ipcMain.on("bluetooth-start-discovery", bluetoothStartDiscovery);

  ipcMain.on("bluetooth-stop-discovery", bluetoothStopDiscovery);

  ipcMain.on("bluetooth-connect", (_event, devicePath) => {
    if (!isValidDBusPath(devicePath, "/org/bluez/")) {
      logError(`Invalid devicePath for bluetooth-connect: ${devicePath}`);
      return;
    }
    bluetoothConnect(devicePath);
  });

  ipcMain.on("bluetooth-disconnect", (_event, devicePath) => {
    if (!isValidDBusPath(devicePath, "/org/bluez/")) {
      logError(`Invalid devicePath for bluetooth-disconnect: ${devicePath}`);
      return;
    }
    bluetoothDisconnect(devicePath);
  });

  // Logging from Renderer
  ipcMain.on("log", (_event, level, messageParts) => {
    if (!Object.prototype.hasOwnProperty.call(logLevelToLogger, level)) {
      logError(`Invalid log level received from renderer: ${level}`);
      return;
    }
    if (!Array.isArray(messageParts)) {
      logError(`Invalid messageParts received for log: not an array.`);
      return;
    }
    const logger = logLevelToLogger[level] || logError;
    logger(...messageParts);
  });

  // Theme
  ipcMain.handle("get-user-theme", () => getUserTheme());
}

module.exports = { registerIpcHandlers };
