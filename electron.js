const {
  app,
  BrowserWindow,
  session,
  ipcMain,
  nativeImage,
} = require("electron");
const path = require("path");
const { spawn, exec } = require("child_process");
const { promisify } = require("util");

const isDev = process.env.IS_DEV === "1";
const forceWindowed = process.env.FORCE_WINDOWED === "1";

let mainWindow;
let runningGameProcess;

function closeRunningGameProcess() {
  if (!runningGameProcess) {
    return;
  }

  console.warn("closeRunningGameProcess!");

  try {
    process.kill(-runningGameProcess.pid, "SIGTERM");
  } catch (e) {
    runningGameProcess.kill("SIGTERM");
  }
}

function createWindow() {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  session.defaultSession.setDevicePermissionHandler((details) => {
    if (details.deviceType === "hid") {
      console.log(
        `[Permissions] Auto-granting HID permission for device from origin: ${details.origin}`
      );
      return true;
    }
    return false;
  });

  let url;

  if (isDev) {
    url = "http://localhost:5173";
  } else {
    if (__dirname.endsWith("/dist")) {
      url = path.join(__dirname, "index.html");
    } else {
      url = path.join(__dirname, "dist/index.html");
    }

    url = "file://" + url;
  }

  const fullscreen = !forceWindowed && !isDev;

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: fullscreen,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
    frame: !fullscreen,
    title: "Lutris Gamepad UI",
  });

  mainWindow.on("show", () => {
    mainWindow.restore();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    closeRunningGameProcess();
  });

  mainWindow.loadURL(url);
}

ipcMain.handle("get-games", async () => {
  const execPromise = promisify(exec);

  let latestError;

  // first time lutris fail with a dbus error
  for (let i = 0; i < 3; i++) {
    try {
      const { stdout } = await execPromise("lutris -l -j");
      return JSON.parse(stdout);
    } catch (e) {
      latestError = e;
    }
  }

  console.error("lutris fail!", latestError);

  throw latestError;
});

ipcMain.on("launch-game", (_event, gameId) => {
  if (runningGameProcess) {
    throw new Error("A game is already running.");
  }

  const command = "lutris";
  const args = [`lutris:rungameid/${gameId}`];

  runningGameProcess = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });

  if (mainWindow) {
    mainWindow.webContents.send("game-started", gameId);
  }

  const onGameClosed = () => {
    runningGameProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send("game-closed");
      mainWindow.show();
    }
  };

  runningGameProcess.on("close", onGameClosed);
  runningGameProcess.on("error", onGameClosed);
});

ipcMain.on("close-game", () => {
  closeRunningGameProcess();
});

ipcMain.on("set-icon", async (_event, dataURL) => {
  if (!mainWindow) {
    return;
  }

  const iconNative = nativeImage.createFromDataURL(dataURL);
  mainWindow.setIcon(iconNative);
});

ipcMain.on("reboot-pc", () => {
  console.log("Requesting PC reboot...");
  exec("systemctl reboot", (error) => {
    if (error) {
      console.error("Reboot error", error);
    }
  });
});

ipcMain.on("poweroff-pc", () => {
  console.log("Requesting PC power off...");
  exec("systemctl poweroff", (error) => {
    if (error) {
      console.error("Poweroff error", error);
    }
  });
});

ipcMain.on("open-lutris", () => {
  exec("lutris", (error) => {
    if (error) {
      console.error("Open Lutris error", error);
    }
  });
});

ipcMain.on("togle-window-show", () => {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isFocused()) {
    mainWindow.minimize();
  } else {
    mainWindow.show();
  }
});

app.on("window-all-closed", () => {
  closeRunningGameProcess();
  app.quit();
});

app.whenReady().then(createWindow);
