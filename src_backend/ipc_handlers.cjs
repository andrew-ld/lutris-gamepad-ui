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
  subscribeToChanges: subscribeToBluetoothChanges,
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

function registerIpcHandlers() {
  // Game Management
  ipcMain.handle("get-games", getGames);
  ipcMain.on("launch-game", (_event, gameId) => launchGame(gameId));
  ipcMain.on("close-game", closeRunningGameProcess);
  ipcMain.on("open-lutris", () => {
    exec(`bash ${getLutrisWrapperPath()}`, (err) => {
      if (err) logError("Open Lutris error", err);
    });
  });

  // Window & App Management
  ipcMain.on("toggle-window-show", toggleWindowShow);
  ipcMain.on("set-icon", async (_event, dataURL) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.setIcon(nativeImage.createFromDataURL(dataURL));
    }
  });
  ipcMain.on("open-external-link", (_event, url) => {
    if (new URL(url).protocol !== "https:") {
      logError("Attempted to open a non-HTTPS URL:", url);
      return;
    }
    shell.openExternal(url);
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
  ipcMain.on("set-audio-volume", (_event, volume) => setAudioVolume(volume));
  ipcMain.on("set-default-sink", (_event, sinkName) =>
    setDefaultSink(sinkName)
  );
  ipcMain.on("set-audio-mute", (_event, mute) => setAudioMute(mute));

  // Bluetooth Management
  ipcMain.handle("bluetooth-get-state", getBluetoothState);
  ipcMain.on("bluetooth-power-on-adapter", async (_event, adapterPath) =>
    powerOnAdapter(adapterPath)
  );
  ipcMain.on("bluetooth-start-discovery", bluetoothStartDiscovery);
  ipcMain.on("bluetooth-stop-discovery", bluetoothStopDiscovery);
  ipcMain.on("bluetooth-connect", async (_event, devicePath) =>
    bluetoothConnect(devicePath)
  );
  ipcMain.on("bluetooth-disconnect", (_event, devicePath) =>
    bluetoothDisconnect(devicePath)
  );
  subscribeToBluetoothChanges();

  // Logging from Renderer
  ipcMain.on("log", (_event, level, messageParts) => {
    const logger = logLevelToLogger[level] || logError;
    logger(...messageParts);
  });

  // Theme
  ipcMain.handle("get-user-theme", () => getUserTheme());
}

module.exports = { registerIpcHandlers };
