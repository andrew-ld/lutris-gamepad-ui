const { app, screen } = require("electron");
const { spawn, exec } = require("child_process");
const { basename, join, dirname, resolve } = require("path");
const { mkdtemp, readFile } = require("fs/promises");
const { promisify } = require("util");

async function main() {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  const mainAppArguments = process.argv.slice(1).map((a) => {
    if (basename(a) === basename(__filename)) {
      return join(dirname(a), "electron.cjs");
    } else {
      return a;
    }
  });

  const display = screen.getPrimaryDisplay();
  const displayWidth = display.size.width * display.scaleFactor;
  const displayHeight = display.size.height * display.scaleFactor;

  const tmpDir = await mkdtemp("/tmp/");
  const gamescopeFifoPath = join(tmpDir, "gamescope.fifo");

  await promisify(exec)(`mkfifo ${gamescopeFifoPath}`);

  const gamescopeArguments = [
    "--xwayland-count",
    "2",
    "-R",
    gamescopeFifoPath,
    "--fullscreen",
    "--output-width",
    displayWidth.toString(),
    "--nested-width",
    displayWidth.toString(),
    "--output-height",
    displayHeight.toString(),
    "--nested-height",
    displayHeight.toString(),
    "--nested-refresh",
    display.displayFrequency.toString(),
  ];

  const gamescopeProcess = spawn("gamescope", gamescopeArguments, {
    stdio: "inherit",
  });

  gamescopeProcess.on("close", (code) => {
    console.log("gamescope process closed, code:", code);
    app.exit(code);
  });

  const [xorgDisplay, waylandDisplay] = (await readFile(gamescopeFifoPath))
    .toString()
    .split(" ");

  const mainAppProcess = spawn(process.argv0, mainAppArguments, {
    stdio: "inherit",
    env: {
      ...process.env,
      DISPLAY: xorgDisplay,
      GAMESCOPE_WAYLAND_DISPLAY: waylandDisplay,
      GAMEPADUI_GAMESCOPE_INTEGRATION: "1",
      GAMEPADUI_SCALE_FACTOR: display.scaleFactor.toString(),
    },
  });

  mainAppProcess.on("close", (code) => {
    console.log("main app process closed, code:", code);
    app.exit(code);
  });

  app.on("quit", () => {
    try {
      process.kill(-gamescopeProcess.pid, "SIGTERM");
    } catch (e) {
      console.error("unable to kill gamescope process", e);
    }

    try {
      process.kill(-mainAppProcess.pid, "SIGTERM");
    } catch (e) {
      console.error("unable to kill main app process", e);
    }
  });
}

app.on("ready", () => {
  main().catch((e) => {
    console.error("unable to start app", e);
    app.exit(1);
  });
});
