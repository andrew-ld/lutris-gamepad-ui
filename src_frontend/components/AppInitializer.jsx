import { useEffect } from "react";

import icon from "../resources/icon.svg";
import { onThemeUpdated, logError, setIcon } from "../utils/ipc";
import { renderSvgToDataURL } from "../utils/svg.js";
import { reloadApplicationTheme } from "../utils/theme.js";

function AppInitializer({ children }) {
  useEffect(() => {
    reloadApplicationTheme();

    renderSvgToDataURL(icon, 256, 256)
      .then((dataURL) => {
        setIcon(dataURL);
      })
      .catch((error) => logError("unable to render icon", error));

    return onThemeUpdated(() => reloadApplicationTheme());
  }, []);

  return children;
}

export default AppInitializer;
