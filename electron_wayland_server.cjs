const { app } = require("electron");
const { spawn } = require("child_process");
const { launchWaylandServer } = require("nodejs-wayland-server");

function launchMainProcess() {
  const mainAppProcess = spawn(process.argv0, process.argv.slice(1), {
    stdio: "inherit",
    env: {
      ...process.env,
      GAMEPADUI_WAYLAND_SERVER: "1",
    },
  });

  mainAppProcess.on("exit", (code) => {
    console.log("main app process exit, code:", code);
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

if (process.env.GAMEPADUI_WAYLAND_SERVER === "1") {
  require("./electron.cjs");
} else {
  app.on("ready", () => {
    main();
  });
}
