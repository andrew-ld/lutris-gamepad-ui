const { app, Menu } = require("electron");

const { getAppConfig } = require("./src_backend/config_manager.cjs");
const {
  initControllerModeManager,
  shutdownControllerModeManager,
} = require("./src_backend/controller_mode_manager.cjs");
const {
  closeRunningGameProcess,
  toggleGamePause,
} = require("./src_backend/game_manager.cjs");
const { registerIpcHandlers } = require("./src_backend/ipc_handlers.cjs");
const { getMainWindow } = require("./src_backend/state.cjs");
const {
  logInfo,
  logError,
  isDev,
  forceWindowed,
} = require("./src_backend/utils.cjs");
const { createWindow } = require("./src_backend/window_manager.cjs");

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
  shutdownControllerModeManager();
  if (getAppConfig().keepGamesRunningOnQuit) {
    toggleGamePause({ forceStatus: "running" });
  } else {
    closeRunningGameProcess();
  }
  app.quit();
});

// required flags
app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");
app.commandLine.appendSwitch("disable-background-timer-throttling");

// memory usage flags
app.commandLine.appendSwitch(
  "js-flags",
  "--optimize_for_size --max_old_space_size=128",
);
app.commandLine.appendSwitch("renderer-process-limit", "1");

// unused features flags
app.commandLine.appendSwitch("disable-site-isolation-trials");
app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("disable-web-bluetooth");
app.commandLine.appendSwitch("disable-midi");
app.commandLine.appendSwitch("disable-speech-api");
app.commandLine.appendSwitch("disable-speech-synthesis-api");
app.commandLine.appendSwitch("disable-spell-checking");
app.commandLine.appendSwitch("disable-pdf-extension");
app.commandLine.appendSwitch("disable-print-preview");
app.commandLine.appendSwitch("disable-shared-workers");
app.commandLine.appendSwitch("disable-3d-apis");
app.commandLine.appendSwitch("disable-webgl");
app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("disable-domain-reliability");
app.commandLine.appendSwitch("disable-component-update");
app.commandLine.appendSwitch("disable-stack-profiler");
app.commandLine.appendSwitch("disable-extensions");
app.commandLine.appendSwitch("disable-plugins");
app.commandLine.appendSwitch("disable-default-apps");
app.commandLine.appendSwitch("disable-sync");
app.commandLine.appendSwitch("disable-notifications");
app.commandLine.appendSwitch("disable-infobars");

if (!forceWindowed && !isDev) {
  Menu.setApplicationMenu(null);
}

app
  .whenReady()
  .then(() => {
    app.setName("lutris-gamepad-ui");

    try {
      registerIpcHandlers();
      initControllerModeManager();
      createWindow(() => {
        logInfo("Main window closed!");
        if (!getAppConfig().keepGamesRunningOnQuit) {
          closeRunningGameProcess();
        }
      });
    } catch (error) {
      logError("Failed to initialize the application:", error);
      app.quit();
    }
  })
  .catch((error) => {
    console.error("Critical error during app launch:", error);
    app.quit();
  });
