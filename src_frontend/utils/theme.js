import { getUserTheme, logError, logInfo, logWarn } from "./ipc";

function applyTheme(theme) {
  const styleEl = document.querySelector("#user-theme-overrides");

  if (!styleEl || !styleEl.sheet) {
    logError("Theme override style element or stylesheet not found.");
    return;
  }

  const sheet = styleEl.sheet;

  while (sheet.cssRules.length > 0) {
    sheet.deleteRule(0);
  }

  if (!theme || Object.keys(theme).length === 0) {
    return;
  }

  for (const [selector, properties] of Object.entries(theme)) {
    try {
      const ruleIndex = sheet.insertRule(
        `${selector} {}`,
        sheet.cssRules.length,
      );
      const rule = sheet.cssRules[ruleIndex];

      for (const [key, value] of Object.entries(properties)) {
        if (value != null) {
          rule.style.setProperty(key, String(value), "important");
        }
      }
    } catch (error) {
      logWarn(`Skipped invalid CSS selector "${selector}":`, error);
    }
  }
}

export async function reloadApplicationTheme() {
  const theme = await getUserTheme();

  try {
    applyTheme(theme);
    logInfo("Successfully loaded user theme");
  } catch (error) {
    logError("Unable to apply user theme:", error);
  }
}
