import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/main.css";
import icon from "./resources/icon.svg";
import { logError, onThemeUpdated, setIcon } from "./utils/ipc.js";
import { renderSvgToDataURL } from "./utils/svg.js";
import { applyUserTheme } from "./utils/theme.js";
import { playButtonActionSound } from "./utils/sound.js";

if (import.meta.env.DEV) {
  import("react-scan").then(({ scan }) => {
    scan({ enabled: true });
  });
}

applyUserTheme();

renderSvgToDataURL(icon, 256, 256)
  .then((dataURL) => {
    setIcon(dataURL);
  })
  .catch((e) => logError("unable to render icon", e));

onThemeUpdated(() => applyUserTheme());

playButtonActionSound();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
