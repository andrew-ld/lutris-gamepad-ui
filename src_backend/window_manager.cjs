const {
  BrowserWindow,
  session,
  powerSaveBlocker,
  protocol,
  net,
  screen,
  app,
} = require("electron");
const path = require("node:path");
const url = require("url");
const {
  setMainWindow,
  getMainWindow,
  getWhitelistedFiles,
  getRemoteDesktopSessionHandle,
  getRunningGameProcess,
} = require("./state.cjs");
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
const {
  startRemoteDesktopSession,
  sendAltTab,
} = require("./remote_desktop_manager.cjs");
const { initializeThemeManager } = require("./theme_manager.cjs");
const { subscribeToBluetoothChanges } = require("./bluetooth_manager.cjs");

function toggleWindowShow() {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    return;
  }

  if (getRemoteDesktopSessionHandle()) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    logInfo("toggleWindowShow: using remote desktop portal");
    sendAltTab().catch((e) => {
      logError("unable to send alt+tab using remote desktop portal", e);
    });
  } else {
    logInfo("toggleWindowShow: using hide/show fallback");
    if (mainWindow.isFocused() || mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  }
}

function createWindow(onWindowClosedCallback) {
  powerSaveBlocker.start("prevent-display-sleep");

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

  let homePageUrl;

  if (isDev) {
    homePageUrl = "http://localhost:5173";
  } else {
    const mainAppDir = path.join(__dirname, "..");

    if (mainAppDir.endsWith("/dist")) {
      homePageUrl = path.join(mainAppDir, "index.html");
    } else {
      homePageUrl = path.join(mainAppDir, "dist/index.html");
    }

    homePageUrl = "app://" + homePageUrl;
  }

  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler((details) => {
      logWarn("Tried to open window", details);
      return { action: "deny" };
    });

    contents.on("will-navigate", (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);

      if (parsedUrl.origin !== homePageUrl) {
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
    },
    frame: !fullscreen,
    title: "Lutris Gamepad UI",
  });

  setMainWindow(win);

  const startRemoteDesktopSessionDebounced = debounce(() => {
    startRemoteDesktopSession().catch((e) => {
      logError("unable to start remote desktop session", e);
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
  });

  win.loadURL(homePageUrl);
}

module.exports = { createWindow, toggleWindowShow };
