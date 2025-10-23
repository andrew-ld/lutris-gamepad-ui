const { ipcMain, shell, nativeImage } = require("electron");
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
const {
  toggleWindowShow,
  setWindowZoomFactor,
  getWindowZoomFactor,
} = require("./window_manager.cjs");
const {
  logError,
  logInfo,
  logWarn,
  execPromise,
  toastError,
  powerOffPc,
  rebootPc,
} = require("./utils.cjs");
const { getMainWindow } = require("./state.cjs");
const { getUserTheme } = require("./theme_manager.cjs");
const { invokeLutris } = require("./lutris_wrapper.cjs");
const { getAppConfig, setAppConfig } = require("./config_manager.cjs");

const logLevelToLogger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
};

const isValidDBusPath = (path, prefix) => {
  return typeof path === "string" && path.startsWith(prefix);
};

const ipcHandleWithError = (channel, listener) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await listener(event, ...args);
    } catch (error) {
      logError("ipcHandleWithError", channel, error);
      toastError(channel, error);
      throw error;
    }
  });
};

const ipcOnWithError = (channel, listener) => {
  ipcMain.on(channel, async (event, ...args) => {
    try {
      await listener(event, ...args);
    } catch (error) {
      logError("ipcOnWithError", channel, error);
      toastError(channel, error);
    }
  });
};

function registerIpcHandlers() {
  ipcHandleWithError("get-games", async () => {
    return await getGames();
  });

  ipcOnWithError("launch-game", async (_event, gameId) => {
    if (typeof gameId !== "number" || !Number.isInteger(gameId) || gameId < 0) {
      throw new Error(
        `Invalid gameId: ${gameId}. Must be a non-negative integer.`
      );
    }
    launchGame(gameId);
  });

  ipcOnWithError("close-game", async () => closeRunningGameProcess());

  ipcOnWithError("open-lutris", async () => {
    invokeLutris().catch((e) => {
      logError("unable to open lutris", e);
    });
  });

  ipcOnWithError("toggle-window-show", async () => toggleWindowShow());

  ipcOnWithError("set-icon", async (_event, dataURL) => {
    if (
      typeof dataURL !== "string" ||
      !dataURL.startsWith("data:image/png;base64,")
    ) {
      throw new Error(`Invalid dataURL received for set-icon.`);
    }
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.setIcon(nativeImage.createFromDataURL(dataURL));
    }
  });

  ipcOnWithError("open-external-link", async (_event, url) => {
    if (typeof url !== "string") {
      throw new Error("Invalid URL received: not a string.");
    }
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        throw new Error("Attempted to open a non-HTTPS URL.");
      }
      await shell.openExternal(url);
    } catch (e) {
      logError("Invalid URL for open-external-link:", url, e);
      throw new Error(`Could not open invalid URL: ${url}`);
    }
  });

  // App Config
  ipcOnWithError("set-app-config", async (_event, key, value) => {
    setAppConfig(key, value);
  });

  ipcHandleWithError("get-app-config", async () => getAppConfig());

  // System Control
  ipcOnWithError("reboot-pc", async () => {
    logInfo("Requesting PC reboot...");
    await rebootPc();
  });

  ipcOnWithError("poweroff-pc", async () => {
    logInfo("Requesting PC power off...");
    await powerOffPc();
  });

  // Audio Management
  ipcHandleWithError("get-audio-info", async () => {
    return await getAudioInfo();
  });

  ipcOnWithError("set-audio-volume", async (_event, volume) => {
    if (typeof volume !== "number" || volume < 0) {
      throw new Error(
        `Invalid volume: ${volume}. Must be a non-negative number.`
      );
    }
    await setAudioVolume(volume);
  });

  ipcOnWithError("set-default-sink", async (_event, sinkName) => {
    if (typeof sinkName !== "string" || !sinkName.length) {
      throw new Error(
        `Invalid sinkName: ${sinkName}. Must be a non-empty string.`
      );
    }
    await setDefaultSink(sinkName);
  });

  ipcOnWithError("set-audio-mute", async (_event, mute) => {
    if (typeof mute !== "boolean") {
      throw new Error(`Invalid mute value: ${mute}. Must be a boolean.`);
    }
    await setAudioMute(mute);
  });

  // Bluetooth Management
  ipcHandleWithError("bluetooth-get-state", async () => {
    return await getBluetoothState();
  });

  ipcOnWithError("bluetooth-power-on-adapter", async (_event, adapterPath) => {
    if (!isValidDBusPath(adapterPath, "/org/bluez/")) {
      throw new Error(
        `Invalid adapterPath for bluetooth-power-on-adapter: ${adapterPath}`
      );
    }
    await powerOnAdapter(adapterPath);
  });

  ipcOnWithError(
    "bluetooth-start-discovery",
    async () => await bluetoothStartDiscovery()
  );

  ipcOnWithError(
    "bluetooth-stop-discovery",
    async () => await bluetoothStopDiscovery()
  );

  ipcOnWithError("bluetooth-connect", async (_event, devicePath) => {
    if (!isValidDBusPath(devicePath, "/org/bluez/")) {
      throw new Error(
        `Invalid devicePath for bluetooth-connect: ${devicePath}`
      );
    }
    await bluetoothConnect(devicePath);
  });

  ipcOnWithError("bluetooth-disconnect", async (_event, devicePath) => {
    if (!isValidDBusPath(devicePath, "/org/bluez/")) {
      throw new Error(
        `Invalid devicePath for bluetooth-disconnect: ${devicePath}`
      );
    }
    await bluetoothDisconnect(devicePath);
  });

  // Logging from Renderer
  ipcOnWithError("log", async (_event, level, messageParts) => {
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
  ipcHandleWithError("get-user-theme", async () => {
    return getUserTheme();
  });
}

module.exports = { registerIpcHandlers };
