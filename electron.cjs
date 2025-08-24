const { app } = require("electron");
const { createWindow } = require("./src_backend/window_manager.cjs");
const { registerIpcHandlers } = require("./src_backend/ipc_handlers.cjs");
const { closeRunningGameProcess } = require("./src_backend/game_manager.cjs");
const { getMainWindow } = require("./src_backend/state.cjs");
const { logInfo, logError } = require("./src_backend/utils.cjs");
const { initializeThemeManager } = require("./src_backend/theme_manager.cjs");
const { subscribeToBluetoothChanges } = require("./src_backend/bluetooth_manager.cjs");

process.noAsar = true;

process.on("unhandledRejection", (reason, promise) => {
  logError("Caught a global rejection:", reason, promise);
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}

app.on("second-instance", () => {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.show();
  }
});

app.on("window-all-closed", () => {
  closeRunningGameProcess();
  app.quit();
});

app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");

app.whenReady().then(() => {
  app.setName("lutris-gamepad-ui");

  try {
    registerIpcHandlers();
    initializeThemeManager();
    subscribeToBluetoothChanges()
    createWindow(() => {
      logInfo("Main window closed!");
      closeRunningGameProcess();
    });
  } catch (e) {
    logError("Failed to initialize the application:", e);
    app.quit();
  }
});
