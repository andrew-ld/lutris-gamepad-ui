import { scan } from "react-scan";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/main.css";
import icon from "./resources/icon.svg";
import { setIcon } from "./utils/ipc.js";
import { renderSvgToDataURL } from "./utils/svg.js";
import { playActionSound } from "./utils/sound.js";

renderSvgToDataURL(icon, 1024, 1024)
  .then((dataURL) => {
    setIcon(dataURL);
  })
  .catch((e) => console.log("unable to render icon", e));

playActionSound();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (process.env.NODE_ENV === "development") {
  scan({ enabled: true });
}
