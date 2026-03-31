const path = require("node:path");
const url = require("node:url");

const {
  BrowserWindow,
  session,
  powerSaveBlocker,
  protocol,
  net,
  app,
} = require("electron");

const { subscribeToBluetoothChanges } = require("./bluetooth_manager.cjs");
const {
  getAppConfig,
  subscribeConfigValueChange,
} = require("./config_manager.cjs");
const {
  startRemoteDesktopSession,
  sendAltTab,
  stopRemoteDesktopSession,
} = require("./remote_desktop_manager.cjs");
const {
  setMainWindow,
  getMainWindow,
  getWhitelistedFiles,
  getRemoteDesktopSessionHandle,
} = require("./state.cjs");
const { initializeThemeManager } = require("./theme_manager.cjs");
const { checkForUpdates } = require("./update_checker.cjs");
const {
  isDev,
  forceWindowed,
  getElectronPreloadPath,
  logError,
  logWarn,
  debounce,
  logInfo,
  isRunningInsideGamescope,
} = require("./utils.cjs");
const { x11gamescopeToggleFocus } = require("./x11_manager.cjs");

function getWindowZoomFactor() {
  return getAppConfig().zoomFactor || 1;
}

function setWindowZoomFactor(factor) {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.setZoomFactor(factor || 1);
  }
}

function createSendAltTabDebounced(delayMs) {
  return debounce(() => {
    sendAltTab().catch((error) => {
      logError("unable to send alt+tab using remote desktop portal", error);
    });
  }, delayMs);
}

let sendAltTabDebounced = createSendAltTabDebounced(
  getAppConfig().gamepadAutorepeatMs,
);

subscribeConfigValueChange("gamepadAutorepeatMs", (newValue) => {
  sendAltTabDebounced = createSendAltTabDebounced(newValue);
});

function toggleWindowShow() {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    return;
  }

  if (isRunningInsideGamescope()) {
    logInfo("toggleWindowShow: using gamescope");

    const showUp = !mainWindow.isFocused();

    x11gamescopeToggleFocus(showUp).catch((error) => {
      logError("x11gamescopeToggleFocus", error);
    });

    return;
  }

  if (getRemoteDesktopSessionHandle()) {
    logInfo("toggleWindowShow: using remote desktop portal");
    sendAltTabDebounced();
    return;
  }

  logInfo("toggleWindowShow: using fallback");

  if (mainWindow.isMinimized()) {
    mainWindow.maximizable();
    mainWindow.hide();
    mainWindow.restore();
    mainWindow.show();
  } else {
    mainWindow.minimize();
  }
}

function fillSearchParams(searchParams, envPrefix, searchParamPrefix) {
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith(envPrefix) && v === "1") {
      const flag = k.slice(envPrefix.length);
      searchParams.append(`${searchParamPrefix}_${flag}`, "1");
    }
  }
}

function getHomePageUrl() {
  const searchParams = new URLSearchParams();
  fillSearchParams(searchParams, "LUTRIS_GAMEPAD_UI_ENABLE_", "ENABLE");
  fillSearchParams(searchParams, "LUTRIS_GAMEPAD_UI_DISABLE_", "DISABLE");

  const queryString = searchParams.toString();
  const suffix = queryString ? `?${queryString}` : "";

  if (isDev) {
    return "http://localhost:5173" + suffix;
  }

  const mainAppDir = path.join(__dirname, "..");

  const htmlPath = mainAppDir.endsWith("/dist")
    ? path.join(mainAppDir, "index.html")
    : path.join(mainAppDir, "dist/index.html");

  return "app://" + htmlPath + suffix;
}

function createWindow(onWindowClosedCallback) {
  powerSaveBlocker.start("prevent-display-sleep");
  powerSaveBlocker.start("prevent-app-suspension");

  session.defaultSession.setDevicePermissionHandler((details) => {
    return details.deviceType === "hid";
  });

  const allowedProtocols = new Set(["app:", "devtools:"]);
  if (isDev) {
    allowedProtocols.add("http:");
    allowedProtocols.add("ws:");
  }

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const requestProtocol = new URL(details.url).protocol;
    callback({ cancel: !allowedProtocols.has(requestProtocol) });
  });

  protocol.handle("app", (request) => {
    const requestedUrl = new URL(request.url);
    const requestedPath = path.resolve(path.normalize(requestedUrl.pathname));
    const whitelistedFiles = getWhitelistedFiles();
    const mainAppDir = path.join(__dirname, "..");

    const authorized =
      requestedPath.startsWith(mainAppDir + "/") ||
      whitelistedFiles.has(requestedPath);

    if (!authorized) {
      logError("Unauthorized file access:", requestedPath);
      return new Response(null, { status: 403 });
    }

    return net.fetch(url.pathToFileURL(requestedPath).toString());
  });

  const homePageUrl = getHomePageUrl();

  logInfo("homePageUrl:", homePageUrl);

  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler((details) => {
      logWarn("Tried to open window", details);
      return { action: "deny" };
    });

    contents.on("will-navigate", (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);

      if (parsedUrl.origin !== new URL(homePageUrl).origin) {
        logWarn("Tried to navigate to another page", parsedUrl);
        event.preventDefault();
      }
    });
  });

  const fullscreen = !forceWindowed && !isDev;

  const win = new BrowserWindow({
    fullscreen,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      sandbox: true,
      preload: getElectronPreloadPath(),
      autoplayPolicy: "no-user-gesture-required",
    },
    frame: !fullscreen,
    title: "Lutris Gamepad UI",
  });

  if (!fullscreen) {
    win.setSize(1280, 800);
  }

  setMainWindow(win);

  subscribeConfigValueChange("zoomFactor", setWindowZoomFactor);

  const startRemoteDesktopSessionDebounced = debounce(() => {
    startRemoteDesktopSession().catch((error) => {
      logError("unable to start remote desktop session", error);
    });
  }, 1000);

  win.on("focus", () => {
    if (!isRunningInsideGamescope()) {
      startRemoteDesktopSessionDebounced();
    }
  });

  win.on("focus", () => {
    if (fullscreen) {
      win.setFullScreen(true);
    }
  });

  win.on("show", () => {
    win.restore();
    win.focus();
    if (fullscreen) {
      win.setFullScreen(true);
    }
  });

  win.on("closed", () => {
    setMainWindow(null);
    if (onWindowClosedCallback) {
      onWindowClosedCallback();
    }
  });

  win.webContents.once("did-stop-loading", () => {
    initializeThemeManager();
    subscribeToBluetoothChanges();
    win.webContents.setZoomFactor(getWindowZoomFactor());
    checkForUpdates().catch((error) => {
      logError("unable to check for new updates:", error);
    });
  });

  subscribeConfigValueChange("useRemoteDesktopPortal", (enabled) => {
    if (enabled) {
      startRemoteDesktopSessionDebounced();
    } else {
      stopRemoteDesktopSession().catch((error) => {
        logError("unable to stop remote desktop session", error);
      });
    }
  });

  win.loadURL(homePageUrl);
}

module.exports = {
  createWindow,
  toggleWindowShow,
};
