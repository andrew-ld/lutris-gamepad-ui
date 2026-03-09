import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/main.css";
import icon from "./resources/icon.svg";
import { logError, setIcon } from "./utils/ipc.js";
import { renderSvgToDataURL } from "./utils/svg.js";

if (import.meta.env.DEV) {
  import("react-scan").then(({ scan }) => {
    scan({ enabled: true });
  });
}

renderSvgToDataURL(icon, 256, 256)
  .then((dataURL) => {
    setIcon(dataURL);
  })
  .catch((e) => logError("unable to render icon", e));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
