const {
  app,
  BrowserWindow,
  session,
  ipcMain,
  nativeImage,
  globalShortcut,
  powerSaveBlocker,
  protocol,
  net,
} = require("electron");
const { spawn, exec } = require("child_process");
const { promisify } = require("util");
const { homedir } = require("os");
const { existsSync, readFileSync } = require("fs");
const { readFile } = require("fs/promises");
const PAClient = require("paclient");
const path = require("node:path");
const url = require("url");

const isDev = process.env.IS_DEV === "1";
const forceWindowed = process.env.FORCE_WINDOWED === "1";

const whitelistedAppProtocolFiles = new Set();

const lutrisEnv = { ...process.env };
lutrisEnv["DBUS_SESSION_BUS_ADDRESS"] = "unix:path=/dev/null";

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

  const pulseAudioCookiePath = path.join(homedir(), "/.config/pulse/cookie");

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

  pa.on("close", () => {
    if (_pulseAudioClient === pa) {
      _pulseAudioClient = null;
    }
  });

  try {
    const connectPromise = new Promise((resolve, reject) => {
      const onReady = () => {
        pa.off("ready", onReady);
        pa.off("error", onError);
        resolve();
      };

      const onError = (e) => {
        pa.off("ready", onReady);
        pa.off("error", onError);
        reject(e);
      };

      pa.on("ready", onReady);
      pa.on("error", onError);
    });

    pa.connect(config);

    await connectPromise;

    _pulseAudioClient = pa;
  } catch (e) {
    console.error("unable to get pulse audio client:", e);
    return null;
  }

  pa.on("change", () => {
    sendCurrentAudioInfo(pa);
  });

  pa.on("new", () => {
    sendCurrentAudioInfo(pa);
  });

  pa.on("remove", () => {
    sendCurrentAudioInfo(pa);
  });

  pa.subscribe("all");

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

function findLutrisWrapperChildren(pid) {
  const childrenPath = path.join(
    "/proc",
    String(pid),
    "task",
    String(pid),
    "children"
  );

  const childrenContent = readFileSync(childrenPath, "utf8");

  return childrenContent
    .trim()
    .split(" ")
    .map(Number)
    .filter((childPid) => {
      if (!childPid) {
        return false;
      }

      try {
        const cmdline = readFileSync(
          path.join("/proc", String(childPid), "cmdline"),
          "utf8"
        );

        return cmdline.startsWith("lutris-wrapper");
      } catch (e) {
        console.error("unable to read cmdline of pid", childPid);
        return false;
      }
    });
}

function closeRunningGameProcess() {
  if (!runningGameProcess) {
    return;
  }

  let lutrisWrapperPids;

  try {
    lutrisWrapperPids = findLutrisWrapperChildren(runningGameProcess.pid);
  } catch (e) {
    console.error("unable to find lutris wrapper child", e);
  }

  let killablePids;

  if (lutrisWrapperPids?.length) {
    console.info("using lutris wrapper pid for close running game");
    killablePids = lutrisWrapperPids;
  } else {
    console.info("using lutris main process pid for close running game");
    killablePids = [runningGameProcess.pid];
  }

  for (const killablePid of killablePids) {
    console.info("sending sigterm to pid", killablePid);

    try {
      process.kill(killablePid, "SIGTERM");
    } catch (e) {
      console.error("unable to kill pid", killablePid, e);
    }
  }
}

function toggleWindowShow() {
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
    return details.deviceType === "hid";
  });

  const allowedProtocols = new Set();
  allowedProtocols.add("app:");
  allowedProtocols.add("devtools:");
  if (isDev) {
    allowedProtocols.add("http:");
  }

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const protocol = new URL(details.url).protocol;

    if (allowedProtocols.has(protocol)) {
      callback({});
      return;
    }

    callback({ cancel: true });
  });

  protocol.handle("app", (request) => {
    const requestedUrl = new URL(request.url);
    const requestedPath = path.resolve(path.normalize(requestedUrl.pathname));

    const authorized =
      requestedPath.startsWith(__dirname + "/") ||
      whitelistedAppProtocolFiles.has(requestedPath);

    if (!authorized) {
      console.error("unauthorized file access: ", requestedPath);
      return;
    }

    return net.fetch(url.pathToFileURL(requestedPath).toString());
  });

  let homePageUrl;

  if (isDev) {
    homePageUrl = "http://localhost:5173";
  } else {
    if (__dirname.endsWith("/dist")) {
      homePageUrl = path.join(__dirname, "index.html");
    } else {
      homePageUrl = path.join(__dirname, "dist/index.html");
    }

    homePageUrl = "app://" + homePageUrl;
  }

  const fullscreen = !forceWindowed && !isDev;

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: fullscreen,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      sandbox: true,
      preload: path.join(__dirname, "electron_preload.js"),
    },
    frame: !fullscreen,
    title: "Lutris Gamepad UI",
  });

  globalShortcut.register("CommandOrControl+X", () => {
    if (mainWindow && runningGameProcess) {
      toggleWindowShow();
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

  mainWindow.loadURL(homePageUrl);
}

ipcMain.handle("get-games", async () => {
  const execPromise = promisify(exec);

  const { stdout: rawGames } = await execPromise("lutris -l -j", {
    env: lutrisEnv,
  });

  const games = JSON.parse(rawGames);

  const lutrisCoverDir = path.join(homedir(), "/.local/share/lutris/coverart/");

  for (const game of games) {
    if (game.coverPath) {
      whitelistedAppProtocolFiles.add(game.coverPath);
      continue;
    }

    if (!game.slug) {
      continue;
    }

    const gameCoverFile = path.join(lutrisCoverDir, game.slug + ".jpg");

    if (existsSync(gameCoverFile)) {
      game.coverPath = gameCoverFile;
      whitelistedAppProtocolFiles.add(gameCoverFile);
    }
  }

  return games;
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

ipcMain.on("toggle-window-show", () => {
  toggleWindowShow();
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
  });
});

app.on("window-all-closed", async () => {
  closeRunningGameProcess();
  app.quit();
});

app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");

app.whenReady().then(createWindow);
