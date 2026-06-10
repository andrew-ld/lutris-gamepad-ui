const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");

const { getAppConfig } = require("./config_manager.cjs");
const { getLutrisGames, syncLutrisAccount } = require("./lutris_wrapper.cjs");
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
  toastError,
  getProcessDescendants,
  isProcessPaused,
} = require("./utils.cjs");

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

let __firstAccountSyncPromise = null;

function startFirstAccountSync() {
  if (__firstAccountSyncPromise) {
    return __firstAccountSyncPromise;
  }

  let timeoutId;

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      logError("first account sync timed out after 5s");
      resolve();
    }, 5000);
  });

  __firstAccountSyncPromise = Promise.race([
    syncLutrisAccount().catch((error) => {
      logError("first account sync failed:", error);
    }),
    timeoutPromise,
  ]).finally(() => {
    clearTimeout(timeoutId);
  });

  return __firstAccountSyncPromise;
}

async function getGames() {
  await startFirstAccountSync();
  const games = await getLutrisGames();

  for (const g of games) {
    g.id = Number.parseInt(g.id);
  }

  for (const game of games) {
    if (game.runtimeIconPath) {
      addWhitelistedFile(game.runtimeIconPath);
    }
  }

  for (const game of games) {
    if (game.coverPath) {
      addWhitelistedFile(game.coverPath);
    }
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

  let onGameClosedDispatched = false;

  const onGameClosed = () => {
    if (onGameClosedDispatched) return;
    onGameClosedDispatched = true;

    setRunningGameProcess(null);

    if (mainWindow) {
      mainWindow.webContents.send("game-closed");
      mainWindow.show();
    }

    syncLutrisAccount().catch((error) => {
      logError("Lutris account sync failed after game close:", error);
    });
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
  startFirstAccountSync,
  getGames,
  launchGame,
  closeRunningGameProcess,
  toggleGamePause,
};
