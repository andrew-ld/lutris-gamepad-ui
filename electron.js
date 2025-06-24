const {
  app,
  BrowserWindow,
  session,
  ipcMain,
  nativeImage,
  globalShortcut,
  powerSaveBlocker,
} = require("electron");
const path = require("path");
const { spawn, exec } = require("child_process");
const { promisify } = require("util");
const { PulseAudio } = require("@tmigone/pulseaudio");
const { geteuid } = require("process");
const { userInfo } = require("os");
const { existsSync } = require("fs");

const isDev = process.env.IS_DEV === "1";
const forceWindowed = process.env.FORCE_WINDOWED === "1";

let mainWindow;
let runningGameProcess;
let _pulseAudioClient;

async function getPulseAudioClient() {
  if (_pulseAudioClient) {
    return _pulseAudioClient;
  }

  const pulseAudioUnixSocketPath = path.join(
    process.env["XDG_RUNTIME_DIR"] || `/run/user/${geteuid()}/`,
    "/pulse/native"
  );

  let puseAudioCookiePath = path.join(
    process.env["HOME"] || `/home/${userInfo().username}/`,
    "/.config/pulse/cookie"
  );

  if (!existsSync(puseAudioCookiePath)) {
    console.error("pulse audio cookie file not found", puseAudioCookiePath);
    puseAudioCookiePath = null;
  }

  const result = new PulseAudio(
    `unix:${pulseAudioUnixSocketPath}`,
    puseAudioCookiePath
  );

  try {
    await result.connect();
    await result.setClientName("lutris-gamepad-ui");
    _pulseAudioClient = result;
  } catch (e) {
    console.error("unable to get pulse audio client", e);

    try {
      result.disconnect();
    } catch (disconnectError) {
      console.error("unable to diconnect pulse audio client", disconnectError);
    }

    return;
  }

  _pulseAudioClient = result;
  return result;
}

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

function togleWindowShow() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isFocused()) {
    mainWindow.minimize();
  } else {
    mainWindow.show();
  }
}

function createWindow() {
  app.on("second-instance", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  powerSaveBlocker.start("prevent-display-sleep");

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

  globalShortcut.register("CommandOrControl+X", () => {
    if (mainWindow && runningGameProcess) {
      togleWindowShow();
    }
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

  const lutrisEnv = { ...process.env };
  lutrisEnv["DBUS_SESSION_BUS_ADDRESS"] = "unix:path=/dev/null";

  runningGameProcess = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    env: lutrisEnv,
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
  togleWindowShow();
});

app.on("window-all-closed", () => {
  closeRunningGameProcess();
  app.quit();
});

app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");

app.whenReady().then(createWindow);
