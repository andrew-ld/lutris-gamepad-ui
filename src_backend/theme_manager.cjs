const { writeFileSync, readFileSync } = require("original-fs");
const defaultTheme = require("./generated/theme.default.json");
const { getDefaultThemeFilePath, getThemeFilePath } = require("./storage.cjs");
const { logError, logWarn } = require("./utils.cjs");

function initializeThemeManager() {
  try {
    const defaultThemePath = getDefaultThemeFilePath();
    writeFileSync(defaultThemePath, JSON.stringify(defaultTheme, null, 2));
  } catch (e) {
    logError("unable to update default theme:", e);
  }
}

function getUserTheme() {
  const computedUserTheme = {};

  let themePath;

  try {
    themePath = getThemeFilePath();
  } catch (e) {
    logError("unable to get theme file path", e);
  }

  try {
    const theme = JSON.parse(readFileSync(themePath));

    for (const [selector, props] of Object.entries(theme)) {
      const defaultProps = defaultTheme[selector];

      if (!defaultProps) {
        logWarn(
          "user defined theme selector not present in default theme: ",
          selector
        );

        continue;
      }

      const computedSelectorProps = {};

      for (const [prop, value] of Object.entries(props)) {
        const defaultValue = defaultProps[prop];

        if (!defaultValue) {
          logWarn(
            "user defined theme prop not present in default theme:",
            selector,
            prop
          );

          continue;
        }

        if (value === defaultValue) {
          continue;
        }

        computedSelectorProps[prop] = value;
      }

      if (Object.entries(computedSelectorProps).length) {
        computedUserTheme[selector] = computedSelectorProps;
      }
    }

    return computedUserTheme;
  } catch (e) {
    logError("unable to read user defined theme:", e);
  }

  try {
    writeFileSync(themePath, JSON.stringify(computedUserTheme, null, 2));
  } catch (e) {
    logError("unable to rewrite user theme file:", e);
  }
}

module.exports = { initializeThemeManager, getUserTheme };
