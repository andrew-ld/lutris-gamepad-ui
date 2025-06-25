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
const { userInfo } = require("os");
const { existsSync } = require("fs");
const { readFile } = require("fs/promises");
const PAClient = require("paclient");
const { descriptions } = require("paclient/lib/errors");

const isDev = process.env.IS_DEV === "1";
const forceWindowed = process.env.FORCE_WINDOWED === "1";

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {process | null} */
let runningGameProcess = null;
/** @type {PAClient | null} */
let _pulseAudioClient = null;

/** @returns {Promise<PAClient | null>} */
async function getPulseAudioClient() {
  if (_pulseAudioClient) {
    return _pulseAudioClient;
  }

  const pulseAudioCookiePath = path.join(
    process.env["HOME"] || `/home/${userInfo().username}/`,
    "/.config/pulse/cookie"
  );

  let pulseAudioCookieBuffer;

  if (existsSync(pulseAudioCookiePath)) {
    pulseAudioCookieBuffer = await readFile(pulseAudioCookiePath);
  } else {
    console.error("pulse audio cookie file dont exists", pulseAudioCookiePath);
  }

  const config = {
    cookie: pulseAudioCookieBuffer,
  };

  const pa = new PAClient();

  try {
    pa.connect(config);

    await new Promise((resolve, reject) => {
      pa.on("ready", () => {
        resolve();
      });

      pa.on("error", (e) => {
        reject(e);
      });
    });

    _pulseAudioClient = pa;
  } catch (e) {
    console.error("unable to get pulse audio client:", e);
    return null;
  }

  pa.on("close", () => {
    _pulseAudioClient = null;
  });

  pa.on("change", () => {
    sendCurrentAudioInfo(pa);
  });

  pa.on("new", () => {
    sendCurrentAudioInfo(pa);
  });

  pa.on("remove", () => {
    sendCurrentAudioInfo(pa);
  });

  return pa;
}

/** @param {PAClient} pulseAudioClient */
async function getSinkInfoFromPA(pulseAudioClient) {
  const defaultSinkInfo = await new Promise((resolve, reject) => {
    pulseAudioClient.getSink("@DEFAULT_SINK@", (e, r) => {
      if (e) {
        reject(e);
      } else {
        resolve(r);
      }
    });
  });

  const allSinkInfo = await new Promise((resolve, reject) => {
    pulseAudioClient.getSinks((e, r) => {
      if (e) {
        reject(e);
      } else {
        resolve(r);
      }
    });
  });

  const mapSinkInfo = (sink) => {
    const volume = Math.round((sink.channelVolumes[0] / sink.baseVolume) * 100);

    return {
      index: sink.index,
      name: sink.name,
      description: sink.description,
      volume: volume,
      isMuted: sink.muted,
      baseVolume: sink.baseVolume,
    };
  };

  const result = {
    ...mapSinkInfo(defaultSinkInfo),
    availableSinks: allSinkInfo.map(mapSinkInfo),
  };

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

async function sendCurrentAudioInfo(pulseClient) {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send(
    "audio-info-changed",
    await getSinkInfoFromPA(pulseClient)
  );
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

ipcMain.handle("get-audio-info", async () => {
  const pulseClient = await getPulseAudioClient();
  if (pulseClient) {
    return await getSinkInfoFromPA(pulseClient);
  }
});

ipcMain.on("set-audio-volume", async (_event, volumePercent) => {
  const pulseClient = await getPulseAudioClient();

  if (!pulseClient) {
    console.error("Cannot set audio volume: PulseAudio client not available.");
    return;
  }

  const sinkInfo = await getSinkInfoFromPA(pulseClient);

  const targetVolume = Math.max(0, Math.min(100, volumePercent));
  const rawVolume = Math.round((targetVolume / 100) * sinkInfo.baseVolume);

  pulseClient.setSinkVolumes(sinkInfo.index, [rawVolume], (err) => {
    if (err) {
      console.log("Cannot set audio volume", err);
    }
    sendCurrentAudioInfo(pulseClient);
  });
});

ipcMain.on("set-default-sink", async (_event, sinkName) => {
  const pulseClient = await getPulseAudioClient();

  if (!pulseClient) {
    console.error("Cannot set default sink: PulseAudio client not available.");
    return;
  }

  pulseClient.setDefaultSinkByName(sinkName, async (err) => {
    if (err) {
      console.log("Cannot set default sink", err, sinkName);
    }
    sendCurrentAudioInfo(pulseClient);
  });
});

ipcMain.on("set-audio-mute", async (_event, mute) => {
  const pulseClient = await getPulseAudioClient();

  if (!pulseClient) {
    console.error("Cannot set audio mute: PulseAudio client not available.");
    return;
  }

  const sinkInfo = await getSinkInfoFromPA(pulseClient);

  pulseClient.setSinkMute(sinkInfo.index, mute, async (err) => {
    if (err) {
      console.log("Cannot set audio mute", err);
    }
    sendCurrentAudioInfo(pulseClient);
  });
});

app.on("window-all-closed", async () => {
  closeRunningGameProcess();
  app.quit();
});

app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");

app.whenReady().then(createWindow);
