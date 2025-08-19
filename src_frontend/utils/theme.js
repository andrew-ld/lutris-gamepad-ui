import { getUserTheme, logError, logInfo } from "./ipc";

export async function applyUserTheme() {
  try {
    const theme = await getUserTheme();

    if (!theme) {
      return;
    }

    for (const styleSheet of document.styleSheets) {
      for (const rule of styleSheet.cssRules) {
        if (!rule.style) {
          continue;
        }

        const themeRules = theme[rule.selectorText];

        if (!themeRules) {
          continue;
        }

        for (const [k, v] of Object.entries(themeRules)) {
          rule.style.setProperty(k, v);
        }
      }
    }

    logInfo("Sucessfully loaded user theme");
  } catch (e) {
    logError("unable to apply user theme:", e);
  }
}
