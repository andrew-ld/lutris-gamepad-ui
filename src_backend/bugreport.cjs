const { logError, showToastOnUi, execPromise } = require("./utils.cjs");
const util = require("util");
const { packTar } = require("modern-tar");
const { writeFile, readFile } = require("fs/promises");
const {
  generateBugReportFilePath,
  getKvStorageFilePath,
  getLogFilePath,
} = require("./storage.cjs");
const {
  invokeLutris,
  getLutrisGames,
  getAllGamesCategories,
} = require("./lutris_wrapper.cjs");
const packageJson = require("../package.json");
const os = require("os");

async function createBugReportFile() {
  const reporters = [
    { filename: "system-info", generator: generateSystemInfo },
    { filename: "app-config", generator: generateAppConfig },
    { filename: "app-logs", generator: generateAppLogs },
    { filename: "env", generator: generateEnv },
    { filename: "lsb-release", generator: generateLsbRelease },
    { filename: "package", generator: generatePackageJson },
    {
      filename: "lutris-version",
      generator: generateLutrisVersion,
    },
    { filename: "lutris-games", generator: generateLutrisGames },
    {
      filename: "lutris-categories",
      generator: generateLutrisCategories,
    },
    {
      filename: "argv",
      generator: generateSysArgv,
    },
    {
      filename: "whereis-bash",
      generator: () => generateWhereIsBugReport("bash"),
    },
    {
      filename: "whereis-python",
      generator: () => generateWhereIsBugReport("python"),
    },
    {
      filename: "whereis-python3",
      generator: () => generateWhereIsBugReport("python3"),
    },
    {
      filename: "whereis-lutris",
      generator: () => generateWhereIsBugReport("lutris"),
    },
    {
      filename: "whereis-sh",
      generator: () => generateWhereIsBugReport("sh"),
    },
    {
      filename: "flatpak-info-lutris",
      generator: generateFlatpakInfoLutris,
    },
    {
      filename: "bash-alias",
      generator: generateBashAliasList,
    },
    {
      filename: "ps-forest",
      generator: generatePsForest,
    },
    {
      filename: "python-import-debug",
      generator: generateDebugPythonImport,
    },
    {
      filename: "bash-trace-login",
      generator: generateBashTraceLogin,
    },
    {
      filename: "bash-trace",
      generator: generateBashTrace,
    },
  ];

  const entries = [];

  for (const { filename, generator } of reporters) {
    let content;

    try {
      content = await generator();
    } catch (e) {
      logError("unable to generate bug report file", filename, e);
      content = util.inspect(e);
    }

    let contentString;
    let contentExtension;

    if (Buffer.isBuffer(content)) {
      contentString = content;
      contentExtension = "txt";
    } else {
      contentString = JSON.stringify(content, null, 2);
      contentExtension = "json";
    }

    const contentBytes = new TextEncoder().encode(contentString);

    entries.push({
      header: {
        name: `${filename}.${contentExtension}`,
        size: contentBytes.length,
      },
      body: contentBytes,
    });
  }

  const reportPath = generateBugReportFilePath();

  const tarBuffer = await packTar(entries);
  await writeFile(reportPath, tarBuffer);

  showToastOnUi({ title: "Bug Reporter", description: reportPath });
}

async function generatePsForest() {
  return await execPromise("ps -auxf --forest");
}

async function generateBashAliasList() {
  return await execPromise("bash --login -c alias");
}

async function generateDebugPythonImport() {
  return await execPromise(`python3 -v -c "import gi"`);
}

async function generateWhereIsBugReport(filename) {
  return await execPromise(`bash -c "whereis ${filename}"`);
}

async function generateEnv() {
  return process.env;
}

async function generateSysArgv() {
  return process.argv;
}

async function generateLsbRelease() {
  return readFile("/etc/lsb-release");
}

async function generateLutrisVersion() {
  return await invokeLutris(["--version"]);
}

async function generatePackageJson() {
  return packageJson;
}

async function generateSystemInfo() {
  return {
    arch: os.arch(),
    cpus: os.cpus(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    type: os.type(),
    uptime: os.uptime(),
    userInfo: os.userInfo(),
  };
}

async function generateBashTrace() {
  return await execPromise("bash -x -c 'echo 1'");
}

async function generateBashTraceLogin() {
  return await execPromise("bash --login -x -c 'echo 1'");
}

async function generateAppConfig() {
  return readFile(getKvStorageFilePath());
}

async function generateAppLogs() {
  return readFile(getLogFilePath());
}

async function generateLutrisGames() {
  return await getLutrisGames();
}

async function generateLutrisCategories() {
  return await getAllGamesCategories();
}

async function generateFlatpakInfoLutris() {
  return await execPromise("flatpak info net.lutris.Lutris");
}

module.exports = { createBugReportFile };
