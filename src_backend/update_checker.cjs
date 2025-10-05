const { getMainWindow } = require("./state.cjs");
const { logInfo, logError } = require("./utils.cjs");
const packageJson = require("../package.json");

const REPO_OWNER = "andrew-ld";
const REPO_NAME = "lutris-gamepad-ui";
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

async function checkForUpdates() {
  if (!process.env.APPIMAGE) {
    logInfo("Not an AppImage, skipping update check.");
    return;
  }

  logInfo("Checking for application updates...");

  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        "User-Agent": `${REPO_NAME}/${packageJson.version}`,
      },
    });

    if (!response.ok) {
      logError(`Failed to fetch release info. Status code: ${response.status}`);
      return;
    }

    const releaseInfo = await response.json();

    const latestVersion = releaseInfo.tag_name.startsWith("v")
      ? releaseInfo.tag_name.substring(1)
      : releaseInfo.tag_name;

    const currentVersion = packageJson.version;

    logInfo(
      `Current version: ${currentVersion}, Latest version: ${latestVersion}`
    );

    if (currentVersion != latestVersion) {
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send("update-available", {
          version: releaseInfo.tag_name,
          url: releaseInfo.html_url,
        });
      }
    }
  } catch (error) {
    logError("Error checking for updates:", error);
  }
}

module.exports = { checkForUpdates };
