const { app } = require("electron");
const { spawn } = require("child_process");
const { basename, join, dirname } = require("path");
const { launchWaylandServer } = require("nodejs-wayland-server");

function launchMainProcess() {
  const mainAppArguments = process.argv.slice(1).map((a) => {
    if (basename(a) === basename(__filename)) {
      return join(dirname(a), "electron.cjs");
    } else {
      return a;
    }
  });

  const mainAppProcess = spawn(process.argv0, mainAppArguments, {
    stdio: "inherit",
    env: {
      ...process.env,
      GAMEPADUI_WAYLAND_SERVER: "1",
    },
  });

  mainAppProcess.on("close", (code) => {
    console.log("main app process closed, code:", code);
    app.exit(code);
  });

  app.on("quit", () => {
    try {
      process.kill(-mainAppProcess.pid, "SIGTERM");
    } catch (e) {
      console.error("unable to kill main app process", e);
    }
  });
}

function main() {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  launchWaylandServer(() => {
    launchMainProcess();
  });
}

app.on("ready", () => {
  main();
});
