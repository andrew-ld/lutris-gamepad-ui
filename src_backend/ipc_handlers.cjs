const { ipcMain, shell, nativeImage } = require("electron");

const {
  getAudioInfo,
  setAudioVolume,
  setDefaultSink,
  setAudioMute,
} = require("./audio_manager.cjs");
const {
  getBluetoothState,
  powerOnAdapter,
  startDiscovery: bluetoothStartDiscovery,
  stopDiscovery: bluetoothStopDiscovery,
  connectToDevice: bluetoothConnect,
  disconnectFromDevice: bluetoothDisconnect,
} = require("./bluetooth_manager.cjs");
const { createBugReportFile } = require("./bugreport.cjs");
const { getAppConfig, setAppConfig } = require("./config_manager.cjs");
const {
  getBrightness,
  setBrightness,
  getNightLight,
  setNightLight,
} = require("./display_manager.cjs");
const { listDirectory } = require("./file_manager.cjs");
const {
  getGames,
  launchGame,
  closeRunningGameProcess,
  toggleGamePause,
} = require("./game_manager.cjs");
const {
  invokeLutris,
  getLutrisSettings,
  updateLutrisSetting,
  getLutrisRunners,
} = require("./lutris_wrapper.cjs");
const { mapSdlGamepadsToWebApi, pollGamepads } = require("./sdl_manager.cjs");
const { getMainWindow } = require("./state.cjs");
const { getUserTheme } = require("./theme_manager.cjs");
const {
  logError,
  logInfo,
  logWarn,
  toastError,
  powerOffPc,
  rebootPc,
} = require("./utils.cjs");
const { toggleWindowShow } = require("./window_manager.cjs");

const logLevelToLogger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
};

const isValidDBusPath = (path, prefix) => {
  return typeof path === "string" && path.startsWith(prefix);
};

const ipcHandleWithError = (channel, listener) => {
  ipcMain.handle(channel, async (event, ...arguments_) => {
    try {
      return await listener(event, ...arguments_);
    } catch (error) {
      logError("ipcHandleWithError", channel, error);
      toastError(channel, error);
      throw error;
    }
  });
};

const ipcOnWithError = (channel, listener) => {
  ipcMain.on(channel, async (event, ...arguments_) => {
    try {
      await listener(event, ...arguments_);
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

  ipcOnWithError("toggle-game-pause", async () => {
    toggleGamePause();
  });

  ipcOnWithError("launch-game", async (_event, gameId) => {
    if (typeof gameId !== "number" || !Number.isInteger(gameId) || gameId < 0) {
      throw new Error(
        `Invalid gameId: ${gameId}. Must be a non-negative integer.`,
      );
    }
    launchGame(gameId);
  });

  ipcOnWithError("close-game", async () => closeRunningGameProcess());

  ipcOnWithError("open-lutris", async () => {
    invokeLutris().catch((error) => {
      logError("unable to open lutris", error);
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
      throw new TypeError("Invalid URL received: not a string.");
    }
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        throw new Error("Attempted to open a non-HTTPS URL.");
      }
      await shell.openExternal(url);
    } catch (error) {
      logError("Invalid URL for open-external-link:", url, error);
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
        `Invalid volume: ${volume}. Must be a non-negative number.`,
      );
    }
    await setAudioVolume(volume);
  });

  ipcOnWithError("set-default-sink", async (_event, sinkName) => {
    if (typeof sinkName !== "string" || sinkName.length === 0) {
      throw new Error(
        `Invalid sinkName: ${sinkName}. Must be a non-empty string.`,
      );
    }
    await setDefaultSink(sinkName);
  });

  ipcOnWithError("set-audio-mute", async (_event, mute) => {
    if (typeof mute !== "boolean") {
      throw new TypeError(`Invalid mute value: ${mute}. Must be a boolean.`);
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
        `Invalid adapterPath for bluetooth-power-on-adapter: ${adapterPath}`,
      );
    }
    await powerOnAdapter(adapterPath);
  });

  ipcOnWithError(
    "bluetooth-start-discovery",
    async () => await bluetoothStartDiscovery(),
  );

  ipcOnWithError(
    "bluetooth-stop-discovery",
    async () => await bluetoothStopDiscovery(),
  );

  ipcOnWithError("bluetooth-connect", async (_event, devicePath) => {
    if (!isValidDBusPath(devicePath, "/org/bluez/")) {
      throw new Error(
        `Invalid devicePath for bluetooth-connect: ${devicePath}`,
      );
    }
    await bluetoothConnect(devicePath);
  });

  ipcOnWithError("bluetooth-disconnect", async (_event, devicePath) => {
    if (!isValidDBusPath(devicePath, "/org/bluez/")) {
      throw new Error(
        `Invalid devicePath for bluetooth-disconnect: ${devicePath}`,
      );
    }
    await bluetoothDisconnect(devicePath);
  });

  // Display Management
  ipcHandleWithError("get-brightness", async () => {
    return await getBrightness();
  });

  ipcHandleWithError("set-brightness", async (_event, brightness) => {
    await setBrightness(brightness);
  });

  ipcHandleWithError("get-night-light", async () => {
    return await getNightLight();
  });

  ipcHandleWithError("set-night-light", async (_event, enabled) => {
    if (typeof enabled !== "boolean") {
      throw new TypeError(
        `Invalid enabled value: ${enabled}. Must be a boolean.`,
      );
    }
    await setNightLight(enabled);
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

  // Lutris Settings
  ipcHandleWithError(
    "get-lutris-settings",
    async (_event, gameSlug, runnerSlug) => {
      return await getLutrisSettings(gameSlug, runnerSlug);
    },
  );

  ipcHandleWithError("get-lutris-runners", async () => {
    return await getLutrisRunners();
  });

  ipcHandleWithError(
    "update-lutris-setting",
    async (_event, section, key, value, type, gameSlug, runnerSlug) => {
      return await updateLutrisSetting(
        section,
        key,
        value,
        type,
        gameSlug,
        runnerSlug,
      );
    },
  );

  // Bug Reporter
  ipcOnWithError("create-bug-report", async () => {
    await createBugReportFile();
  });

  // Sdl
  ipcHandleWithError("poll-gamepads-sdl", async () => {
    return mapSdlGamepadsToWebApi(await pollGamepads());
  });

  // File Manager
  ipcHandleWithError("list-directory", async (_event, dirPath) => {
    if (typeof dirPath !== "string" && dirPath !== null) {
      throw new TypeError("Invalid dirPath: not a string");
    }
    return await listDirectory(dirPath);
  });
}

module.exports = { registerIpcHandlers };
