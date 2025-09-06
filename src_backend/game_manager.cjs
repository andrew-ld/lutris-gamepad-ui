const { spawn } = require("child_process");
const { readFileSync } = require("fs");
const { readdir } = require("node:fs/promises");
const path = require("node:path");
const { globalShortcut } = require("electron");

const {
  getMainWindow,
  getRunningGameProcess,
  setRunningGameProcess,
  addWhitelistedFile,
} = require("./state.cjs");
const {
  execPromise,
  getLutrisWrapperPath,
  logError,
  logInfo,
  logWarn,
  toastError,
} = require("./utils.cjs");
const { toggleWindowShow } = require("./window_manager.cjs");

const runtimeIconCache = new Map();

function findLutrisWrapperChildren(pid, visitedPids) {
  if (visitedPids.has(pid)) return [];
  visitedPids.add(pid);

  const childrenPath = `/proc/${pid}/task/${pid}/children`;
  try {
    const childrenContent = readFileSync(childrenPath, "utf8");
    const childPids = childrenContent
      .trim()
      .split(" ")
      .map(Number)
      .filter(Boolean);

    return childPids.flatMap((childPid) => {
      let directLutrisChild = [];
      try {
        const cmdline = readFileSync(`/proc/${childPid}/cmdline`, "utf8");
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
  } catch (e) {
    logError("Unable to read children of pid", pid, e);
    return [];
  }
}

function closeRunningGameProcess() {
  const runningGameProcess = getRunningGameProcess();
  if (!runningGameProcess) return;

  let lutrisWrapperPids = [];
  try {
    lutrisWrapperPids = findLutrisWrapperChildren(
      runningGameProcess.pid,
      new Set()
    );
  } catch (e) {
    logError("Unable to find lutris wrapper child", e);
  }

  const killablePids = lutrisWrapperPids.length
    ? lutrisWrapperPids
    : [runningGameProcess.pid];
  if (lutrisWrapperPids.length) {
    logInfo("Using lutris wrapper pid for closing running game");
  } else {
    logWarn("Using lutris main process pid for closing running game");
  }

  for (const killablePid of killablePids) {
    logInfo("Sending SIGTERM to pid", killablePid);
    try {
      process.kill(killablePid, "SIGTERM");
    } catch (e) {
      logError("Unable to kill pid", killablePid, e);
    }
  }
}

async function getGames() {
  const wrapperPath = getLutrisWrapperPath();

  const [{ stdout: rawGames }, { stdout: rawCategoriesData }] =
    await Promise.all([
      execPromise(`bash ${wrapperPath} -l -j`),
      execPromise(`bash ${wrapperPath} --get-all-games-categories`),
    ]);

  const games = JSON.parse(rawGames);
  if (!games.length) return games;

  try {
    const {
      categories: allCategories,
      all_games_categories: gameCategoriesMap,
    } = JSON.parse(rawCategoriesData);

    const categoryIdToNameMap = new Map(
      allCategories.map((cat) => [cat.id, cat.name])
    );

    for (const game of games) {
      const categoryIds = gameCategoriesMap[String(game.id)];
      game.categories = categoryIds
        ? categoryIds.map((id) => categoryIdToNameMap.get(id)).filter(Boolean)
        : [];
    }
  } catch (e) {
    logError("Could not process game categories:", e);
  }

  try {
    const uniqueRunners = [
      ...new Set(games.map((g) => g.runner).filter(Boolean)),
    ];
    const runnersToFetch = uniqueRunners.filter(
      (runner) => !runtimeIconCache.has(runner)
    );

    if (runnersToFetch.length > 0) {
      const iconPromises = runnersToFetch.map(async (runner) => {
        try {
          const { stdout } = await execPromise(
            `bash ${wrapperPath} --get-runtime-icon-path "${runner}"`
          );
          const path = stdout.trim();
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
  } catch (e) {
    logError("Could not process runtime icons:", e);
  }

  try {
    const { stdout } = await execPromise(
      `bash ${wrapperPath} --get-coverart-path`
    );
    const lutrisCoverDir = stdout.trim();
    const lutrisCoverDirFiles = await readdir(lutrisCoverDir);

    for (const game of games) {
      if (game.coverPath) {
        addWhitelistedFile(game.coverPath);
        continue;
      }
      if (game.slug) {
        const coverFilename = lutrisCoverDirFiles.find((f) =>
          f.startsWith(`${game.slug}.`)
        );
        if (coverFilename) {
          const coverPath = path.join(lutrisCoverDir, coverFilename);
          game.coverPath = coverPath;
          addWhitelistedFile(coverPath);
        }
      }
    }
  } catch (e) {
    logError("Could not process game cover art:", e);
  }

  return games;
}

function launchGame(gameId) {
  if (getRunningGameProcess()) {
    throw new Error("A game is already running.");
  }

  const gameStartTime = Date.now();

  const newGameProcess = spawn(
    "bash",
    [getLutrisWrapperPath(), `lutris:rungameid/${gameId}`],
    {
      detached: true,
      stdio: "ignore",
    }
  );
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
}

module.exports = { getGames, launchGame, closeRunningGameProcess };
