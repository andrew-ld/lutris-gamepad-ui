const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { readdir } = require("node:fs/promises");
const path = require("node:path");

const { globalShortcut } = require("electron");

const { getAppConfig } = require("./config_manager.cjs");
const {
  getCoverartPath,
  getRuntimeIconPath,
  getAllGamesCategories,
  getLutrisGames,
} = require("./lutris_wrapper.cjs");
const {
  getMainWindow,
  getRunningGameProcess,
  setRunningGameProcess,
  addWhitelistedFile,
  isKnowGameID,
  addKnowGameID,
} = require("./state.cjs");
const {
  getLutrisWrapperPath,
  logError,
  logInfo,
  logWarn,
  toastError,
  getProcessDescendants,
  isProcessPaused,
} = require("./utils.cjs");
const { toggleWindowShow } = require("./window_manager.cjs");

const runtimeIconCache = new Map();

function findLutrisWrapperChildren(pid) {
  const allSubprocesses = getProcessDescendants(pid, new Set());
  return allSubprocesses.filter((childPid) => {
    try {
      const cmdline = readFileSync(`/proc/${childPid}/cmdline`, "utf8");
      return cmdline.startsWith("lutris-wrapper");
    } catch (error) {
      logError("Unable to read cmdline of pid", childPid, error);
      return false;
    }
  });
}

function closeRunningGameProcess() {
  const runningGameProcess = getRunningGameProcess();
  if (!runningGameProcess) return;

  let isPaused;

  try {
    isPaused = isProcessPaused(runningGameProcess.pid);
  } catch (error) {
    logError(
      "Unable to determine if pid",
      runningGameProcess.pid,
      "is paused, assume paused",
      error,
    );
    isPaused = true;
  }

  let pidsToStop;

  const getAllPids = () => {
    const result = getProcessDescendants(runningGameProcess.pid, new Set());
    result.push(runningGameProcess.pid);
    return result;
  };

  if (isPaused) {
    pidsToStop = getAllPids();
  } else {
    try {
      pidsToStop = findLutrisWrapperChildren(runningGameProcess.pid);
    } catch (error) {
      logError("Unable to find lutris wrapper child", error);
    }
    if (!pidsToStop?.length) {
      logError("Unable to locate lutris wrapper child");
      pidsToStop = getAllPids();
    }
  }

  let signal;

  signal = isPaused ? "SIGKILL" : "SIGTERM";

  for (const pid of pidsToStop) {
    logInfo("Sending", signal, "to pid", pid);
    try {
      process.kill(pid, signal);
    } catch (error) {
      logError("Unable to kill pid", pid, error);
    }
  }

  runningGameProcess.stdin.end();
}

async function getGames() {
  const [games, gamesCategories] = await Promise.all([
    getLutrisGames(),
    getAllGamesCategories(),
  ]);

  if (games.length === 0) return games;

  try {
    const {
      categories: allCategories,
      all_games_categories: gameCategoriesMap,
    } = gamesCategories;

    const hiddenGamesCategory = allCategories.find((c) => c.name === ".hidden");

    const categoryIdToNameMap = new Map(
      allCategories
        .filter((c) => c !== hiddenGamesCategory)
        .map((cat) => [cat.id, cat.name]),
    );

    for (const game of games) {
      const categoryIds = gameCategoriesMap[String(game.id)] || [];

      const categories = categoryIds
        .map((id) => categoryIdToNameMap.get(id))
        .filter(Boolean);

      if (hiddenGamesCategory && !game.hidden) {
        game.hidden = categoryIds.includes(hiddenGamesCategory.id);
      }

      game.categories = categories;
    }
  } catch (error) {
    logError("Could not process game categories:", error);
  }

  try {
    const uniqueRunners = [
      ...new Set(games.map((g) => g.runner).filter(Boolean)),
    ];
    const runnersToFetch = uniqueRunners.filter(
      (runner) => !runtimeIconCache.has(runner),
    );

    if (runnersToFetch.length > 0) {
      const iconPromises = runnersToFetch.map(async (runner) => {
        try {
          const path = await getRuntimeIconPath(runner);
          if (path) {
            runtimeIconCache.set(runner, path);
            addWhitelistedFile(path);
          } else {
            runtimeIconCache.set(runner, null);
          }
        } catch (error) {
          logWarn(`Could not get runtime icon for '${runner}':`, error);
          runtimeIconCache.set(runner, null);
        }
      });
      await Promise.all(iconPromises);
    }

    for (const game of games) {
      if (game.runner && runtimeIconCache.has(game.runner)) {
        const runtimeIconPath = runtimeIconCache.get(game.runner);
        if (runtimeIconPath) {
          game.runtimeIconPath = runtimeIconPath;
        }
      }
    }
  } catch (error) {
    logError("Could not process runtime icons:", error);
  }

  try {
    const lutrisCoverDir = await getCoverartPath();
    const lutrisCoverDirFiles = await readdir(lutrisCoverDir);

    for (const game of games) {
      if (game.coverPath) {
        addWhitelistedFile(game.coverPath);
        continue;
      }
      if (game.slug) {
        const coverFilename = lutrisCoverDirFiles.find((f) =>
          f.startsWith(`${game.slug}.`),
        );
        if (coverFilename) {
          const coverPath = path.join(lutrisCoverDir, coverFilename);
          game.coverPath = coverPath;
          addWhitelistedFile(coverPath);
        }
      }
    }
  } catch (error) {
    logError("Could not process game cover art:", error);
  }

  for (const g of games) {
    addKnowGameID(g.id);
  }

  return games;
}

function toggleGamePause(options) {
  const runningGameProcess = getRunningGameProcess();
  if (!runningGameProcess) return;

  let isGamePaused;

  try {
    isGamePaused = isProcessPaused(runningGameProcess.pid);
  } catch (error) {
    logError("Unable to determine if process is paused", error);
    isGamePaused = true;
  }

  switch (options?.forceStatus) {
    case "running": {
      if (!isGamePaused) return;
      break;
    }

    case "paused": {
      if (isGamePaused) return;
      break;
    }
  }

  let allProcesses;

  try {
    allProcesses = getProcessDescendants(runningGameProcess.pid, new Set());
  } catch (error) {
    logError("Unable to find game subprocesses", error);
    return;
  }

  allProcesses.push(runningGameProcess.pid);

  let signal;

  signal = isGamePaused ? "SIGCONT" : "SIGSTOP";

  for (const pid of allProcesses) {
    try {
      logInfo("sending", signal, "to pid", pid);
      process.kill(pid, signal);
    } catch (error) {
      logError("Unable to send signal", signal, "to pid", pid, error);
    }
  }

  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send("game-pause-state-changed", !isGamePaused);
  }
}

function launchGame(gameId) {
  if (getRunningGameProcess()) {
    throw new Error("A game is already running.");
  }

  if (!isKnowGameID(gameId)) {
    logError("unknown game id", gameId);
    return;
  }

  const gameStartTime = Date.now();

  const newGameProcess = spawn(
    "bash",
    [getLutrisWrapperPath(), `lutris:rungameid/${gameId}`],
    {
      detached: getAppConfig().keepGamesRunningOnQuit,
    },
  );

  const stdoutTextDecoder = new TextDecoder();
  const stderrTextDecoder = new TextDecoder();

  newGameProcess.stdout.on("data", (stdout) => {
    logInfo("rungameid", stdoutTextDecoder.decode(stdout));
  });

  newGameProcess.stderr.on("data", (stderr) => {
    logError("rungameid", stderrTextDecoder.decode(stderr));
  });

  setRunningGameProcess(newGameProcess);

  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send("game-started", gameId);
  }

  globalShortcut.register("CommandOrControl+X", toggleWindowShow);

  const onGameClosed = () => {
    setRunningGameProcess(null);
    if (mainWindow) {
      mainWindow.webContents.send("game-closed");
      mainWindow.show();
    }
    globalShortcut.unregister("CommandOrControl+X");
  };

  newGameProcess.on("close", onGameClosed);

  newGameProcess.on("error", (e) => {
    logError("game process error:", e);

    const gameCloseTime = Date.now();
    if (gameCloseTime - gameStartTime < 10_000) {
      toastError("launchGame", e);
    }

    onGameClosed();
  });

  if (newGameProcess.exitCode !== null) {
    onGameClosed();
  }
}

module.exports = {
  getGames,
  launchGame,
  closeRunningGameProcess,
  toggleGamePause,
};
