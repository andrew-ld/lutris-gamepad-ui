const {
  existsSync,
  readFileSync,
  writeFileSync,
  watch,
} = require("original-fs");
const defaultTheme = require("./generated/theme.default.json");
const { getDefaultThemeFilePath, getThemeFilePath } = require("./storage.cjs");
const { logError, logWarn, logInfo } = require("./utils.cjs");
const { getMainWindow } = require("./state.cjs");

function ensureUserThemeFileExists() {
  try {
    const themePath = getThemeFilePath();
    if (!existsSync(themePath)) {
      writeFileSync(themePath, "{}");
      logInfo(`Created empty user theme file at: ${themePath}`);
    }
  } catch (error) {
    logError("Unable to create or check for user theme file.", error);
  }
}

function readUserThemeFile() {
  try {
    const themePath = getThemeFilePath();
    if (!existsSync(themePath)) {
      return {};
    }
    const fileContent = readFileSync(themePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    logError("Failed to read or parse user theme file. Using defaults.", error);
    return {};
  }
}

function mergeThemes(baseTheme, userOverrides) {
  const computedTheme = JSON.parse(JSON.stringify(baseTheme));

  for (const [selector, userProps] of Object.entries(userOverrides)) {
    const defaultProps = baseTheme[selector];

    if (!defaultProps) {
      logWarn(
        `User theme contains a selector not in the default theme: "${selector}". Skipping.`
      );
      continue;
    }

    for (const [prop, value] of Object.entries(userProps)) {
      if (!Object.hasOwn(defaultProps, prop)) {
        logWarn(
          `User theme contains a property not in the default theme for selector "${selector}": "${prop}". Skipping.`
        );
        continue;
      }
      computedTheme[selector][prop] = value;
    }
  }

  return computedTheme;
}

function initializeThemeManager() {
  try {
    const defaultThemePath = getDefaultThemeFilePath();
    writeFileSync(defaultThemePath, JSON.stringify(defaultTheme, null, 2));
  } catch (error) {
    logError("Unable to write the default theme file for reference.", error);
  }

  ensureUserThemeFileExists();

  try {
    watch(getThemeFilePath(), (eventType) => {
      if (eventType === "change") {
        getMainWindow()?.webContents.send("user-theme-updated");
      }
    });
  } catch (error) {
    logWarn("Unable to start watching the user theme file for changes.", error);
  }
}

function getUserTheme() {
  const userThemeOverrides = readUserThemeFile();
  return mergeThemes(defaultTheme, userThemeOverrides);
}

module.exports = {
  initializeThemeManager,
  getUserTheme,
};
