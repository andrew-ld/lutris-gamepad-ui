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
  session.defaultSession.setDevicePermissionHandler((details) => {
    if (details.deviceType === "hid") {
      console.log(
        `[Permissions] Auto-granting HID permission for device from origin: ${details.origin}`
      );
      return true;
    }
    return false;
  });

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: !forceWindowed && !isDev,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
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

  mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
    closeRunningGameProcess();
  });
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

  runningGameProcess.on("close", () => {
    runningGameProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send("game-closed");
    }
  });

  runningGameProcess.on("error", () => {
    runningGameProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send("game-closed");
    }
  });
});

ipcMain.on("close-game", () => {
  closeRunningGameProcess();
});

ipcMain.on("set-icon", async (_event, iconSvg) => {
  if (!mainWindow) {
    return;
  }

  const image = nativeImage.createFromPath(iconSvg);
  mainWindow.setIcon(image);
});

app.on("window-all-closed", () => {
  app.quit();
  closeRunningGameProcess();
});

app.whenReady().then(createWindow);
