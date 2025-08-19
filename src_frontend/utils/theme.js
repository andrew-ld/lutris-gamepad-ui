import { getUserTheme, logError } from "./ipc";

export async function applyUserTheme() {
  try {
    const theme = await getUserTheme();

    for (const styleSheet of document.styleSheets) {
      for (const rule of styleSheet.cssRules) {
        const themeRules = theme[rule.selectorText];

        if (!themeRules) {
          continue;
        }

        for (const [k, v] of Object.entries(themeRules)) {
          rule.style.setProperty(k, v);
        }
      }
    }
  } catch (e) {
    logError("unable to apply user theme:", e);
  }
}
