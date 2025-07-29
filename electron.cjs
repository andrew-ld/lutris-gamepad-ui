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
  screen,
  shell,
} = require("electron");
const { spawn, exec } = require("child_process");
const { promisify } = require("util");
const { homedir } = require("os");
const { existsSync, readFileSync } = require("fs");
const { readFile } = require("fs/promises");
const PAClient = require("paclient");
const path = require("node:path");
const url = require("url");
const { cwd } = require("node:process");
const { globSync } = require("node:fs");

const {
  info: logInfo,
  warn: logWarn,
  error: logError,
} = require("./electron_logger.cjs");
const { readdir } = require("node:fs/promises");

process.noAsar = true;

const execPromise = promisify(exec);

const isDev = process.env.IS_DEV === "1";
const forceWindowed = process.env.FORCE_WINDOWED === "1";
const whitelistedAppProtocolFiles = new Set();

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
    logError("pulse audio cookie file dont exists", pulseAudioCookiePath);
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
    logError("unable to get pulse audio client:", e);
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

function findLutrisWrapperChildren(pid, visitedPids) {
  if (visitedPids.has(pid)) {
    return [];
  }

  visitedPids.add(pid);

  const childrenPath = path.join(
    "/proc",
    String(pid),
    "task",
    String(pid),
    "children"
  );

  let childrenContent;

  try {
    childrenContent = readFileSync(childrenPath, "utf8");
  } catch (e) {
    logError("Unable to read children of pid", pid, e);
    return [];
  }

  const childPids = childrenContent
    .trim()
    .split(" ")
    .map(Number)
    .filter(Boolean);

  return childPids.flatMap((childPid) => {
    const directLutrisChild = [];

    try {
      const cmdline = readFileSync(
        path.join("/proc", String(childPid), "cmdline"),
        "utf8"
      );

      if (cmdline.startsWith("lutris-wrapper")) {
        directLutrisChild.push(childPid);
      }
    } catch (e) {
      logError("Unable to read cmdline of pid", childPid, e);
    }

    const lutrisGrandchildren = findLutrisWrapperChildren(
      childPid,
      visitedPids
    );

    return directLutrisChild.concat(lutrisGrandchildren);
  });
}

function closeRunningGameProcess() {
  if (!runningGameProcess) {
    return;
  }

  let lutrisWrapperPids;

  try {
    lutrisWrapperPids = findLutrisWrapperChildren(
      runningGameProcess.pid,
      new Set()
    );
  } catch (e) {
    logError("unable to find lutris wrapper child", e);
  }

  let killablePids;

  if (lutrisWrapperPids?.length) {
    logInfo("using lutris wrapper pid for close running game");
    killablePids = lutrisWrapperPids;
  } else {
    logWarn("using lutris main process pid for close running game");
    killablePids = [runningGameProcess.pid];
  }

  for (const killablePid of killablePids) {
    logInfo("sending sigterm to pid", killablePid);

    try {
      process.kill(killablePid, "SIGTERM");
    } catch (e) {
      logError("unable to kill pid", killablePid, e);
    }
  }
}

function localeAppFile(name) {
  const DIRECTORIES = [
    cwd(),
    __dirname,
    process.resourcesPath,
    path.join(process.resourcesPath, "app.asar.unpacked"),
  ];

  for (const directory of DIRECTORIES) {
    const wrapperAbsolutePath = path.join(directory, name);

    if (existsSync(wrapperAbsolutePath)) {
      return wrapperAbsolutePath;
    }
  }

  return new Error("unable to find: " + name);
}

function getLutrisWrapperPath() {
  return localeAppFile("lutris_wrapper.sh");
}

function getElectronPreloadPath() {
  return localeAppFile("electron_preload.cjs");
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
    callback({ cancel: !allowedProtocols.has(protocol) });
  });

  protocol.handle("app", (request) => {
    const requestedUrl = new URL(request.url);
    const requestedPath = path.resolve(path.normalize(requestedUrl.pathname));

    const authorized =
      requestedPath.startsWith(__dirname + "/") ||
      whitelistedAppProtocolFiles.has(requestedPath);

    if (!authorized) {
      logError("unauthorized file access: ", requestedPath);
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

  let width = 800;
  let height = 600;

  if (fullscreen) {
    const display = screen.getPrimaryDisplay();
    width = display.size.width;
    height = display.size.height;
  }

  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: fullscreen,
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

  mainWindow.on("focus", () => {
    if (fullscreen) {
      mainWindow.setFullScreen(true);
    }
  });

  mainWindow.on("show", () => {
    mainWindow.restore();
    mainWindow.focus();
    if (fullscreen) {
      mainWindow.setFullScreen(true);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    closeRunningGameProcess();
  });

  mainWindow.loadURL(homePageUrl);
}

async function getCoverArtDirectory() {
  const result = await execPromise(
    `bash ${getLutrisWrapperPath()} --get-coverart-path`
  );

  return result.stdout.trim();
}

ipcMain.handle("get-games", async () => {
  const { stdout: rawGames } = await execPromise(
    `bash ${getLutrisWrapperPath()} -l -j`
  );

  const games = JSON.parse(rawGames);

  if (games.length) {
    let lutrisCoverDir;

    try {
      lutrisCoverDir = await getCoverArtDirectory();
    } catch (e) {
      logError("unable to get lutris cover dir", e);
    }

    let lutrisCoverDirFiles;

    try {
      lutrisCoverDirFiles = await readdir(lutrisCoverDir);
    } catch (e) {
      logError("unable to list files in lutris cover dir", lutrisCoverDir, e);
    }

    for (const game of games) {
      if (game.coverPath) {
        whitelistedAppProtocolFiles.add(game.coverPath);
        continue;
      }

      if (!game.slug || !lutrisCoverDir) {
        continue;
      }

      if (lutrisCoverDirFiles) {
        const coverFilename = lutrisCoverDirFiles.find((f) =>
          f.startsWith(game.slug + ".")
        );

        if (coverFilename) {
          const coverPath = path.join(lutrisCoverDir, coverFilename);
          game.coverPath = coverPath;
          whitelistedAppProtocolFiles.add(coverPath);
        }
      }
    }
  }

  return games;
});

ipcMain.on("launch-game", (_event, gameId) => {
  if (runningGameProcess) {
    throw new Error("A game is already running.");
  }

  const command = "bash";
  const args = [getLutrisWrapperPath(), `lutris:rungameid/${gameId}`];

  globalShortcut.register("CommandOrControl+X", () => {
    if (runningGameProcess) {
      toggleWindowShow();
    }
  });

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

    globalShortcut.unregister("CommandOrControl+X");
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
  logInfo("Requesting PC reboot...");
  exec("systemctl reboot", (error) => {
    if (error) {
      logError("Reboot error", error);
    }
  });
});

ipcMain.on("poweroff-pc", () => {
  logInfo("Requesting PC power off...");
  exec("systemctl poweroff", (error) => {
    if (error) {
      logError("Poweroff error", error);
    }
  });
});

ipcMain.on("open-lutris", () => {
  exec(`bash ${getLutrisWrapperPath()}`, (error) => {
    if (error) {
      logError("Open Lutris error", error);
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

ipcMain.on("open-external-link", (_event, url) => {
  const protocol = new URL(url).protocol;

  if (protocol !== "https:") {
    logError("trying to open a url but is not https", protocol);
    return;
  }

  shell.openExternal(url);
});

ipcMain.on("set-audio-volume", async (_event, volumePercent) => {
  const pulseClient = await getPulseAudioClient();

  if (!pulseClient) {
    logError("Cannot set audio volume: PulseAudio client not available.");
    return;
  }

  const sinkInfo = await getSinkInfoFromPA(pulseClient);

  const targetVolume = Math.max(0, Math.min(100, volumePercent));
  const rawVolume = Math.round((targetVolume / 100) * sinkInfo.baseVolume);

  pulseClient.setSinkVolumes(sinkInfo.index, [rawVolume], (err) => {
    if (err) {
      logInfo("Cannot set audio volume", err);
    }
  });
});

ipcMain.on("set-default-sink", async (_event, sinkName) => {
  const pulseClient = await getPulseAudioClient();

  if (!pulseClient) {
    logError("Cannot set default sink: PulseAudio client not available.");
    return;
  }

  pulseClient.setDefaultSinkByName(sinkName, async (err) => {
    if (err) {
      logInfo("Cannot set default sink", err, sinkName);
    }
  });
});

const logLevelToLogger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
};

ipcMain.on("log", async (_event, level, messageParts) => {
  const logger = logLevelToLogger[level] || logError;
  logger(...messageParts);
});

ipcMain.on("set-audio-mute", async (_event, mute) => {
  const pulseClient = await getPulseAudioClient();

  if (!pulseClient) {
    logError("Cannot set audio mute: PulseAudio client not available.");
    return;
  }

  const sinkInfo = await getSinkInfoFromPA(pulseClient);

  pulseClient.setSinkMute(sinkInfo.index, mute, async (err) => {
    if (err) {
      logInfo("Cannot set audio mute", err);
    }
  });
});

app.on("window-all-closed", async () => {
  closeRunningGameProcess();
  app.quit();
});

app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");

app.whenReady().then(() => {
  app.setName("lutris-gamepad-ui");

  try {
    createWindow();
  } catch (e) {
    logError("unable to create main window", e);
    app.quit();
  }
});
