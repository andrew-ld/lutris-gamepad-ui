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
} = require("./state.cjs");
const {
  isDev,
  forceWindowed,
  getElectronPreloadPath,
  logError,
  logWarn,
  logInfo,
} = require("./utils.cjs");

function toggleWindowShow() {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isFocused()) {
    mainWindow.minimize();
  } else {
    mainWindow.show();
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
  const display = screen.getPrimaryDisplay();

  const { width, height } = fullscreen
    ? display.size
    : { width: 800, height: 600 };

  const win = new BrowserWindow({
    width,
    height,
    fullscreen,
    resizable: !fullscreen,
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

  win.on("focus", () => fullscreen && win.setFullScreen(true));
  win.on("show", () => {
    win.restore();
    win.focus();
    if (fullscreen) win.setFullScreen(true);
  });

  win.on("closed", () => {
    setMainWindow(null);
    if (onWindowClosedCallback) {
      onWindowClosedCallback();
    }
  });

  win.loadURL(homePageUrl);
}

module.exports = { createWindow, toggleWindowShow };
