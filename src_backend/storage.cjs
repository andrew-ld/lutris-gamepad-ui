const fs = require("node:fs");
const path = require("node:path");

const { app } = require("electron");

function getAppHomeDir() {
  const result = path.join(app.getPath("home"), ".local", "lutris-gamepad-ui");
  fs.mkdirSync(result, { recursive: true });
  return result;
}

module.exports = {
  getThemeFilePath: () => {
    return path.join(getAppHomeDir(), "theme.json");
  },

  getDefaultThemeFilePath: () => {
    return path.join(getAppHomeDir(), "theme.default.json");
  },

  getLogFilePath: () => {
    return path.join(getAppHomeDir(), "logs.txt");
  },

  getKvStorageFilePath: () => {
    return path.join(getAppHomeDir(), "config.json");
  },

  generateBugReportFilePath: () => {
    const filename = `bugreport-${new Date().toISOString()}.tar`;
    return path.join(getAppHomeDir(), filename);
  },
};
