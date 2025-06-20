import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/main.css";
import icon from "./icon.svg";
import { setIcon } from "./utils/ipc.js";
import { renderSvgToDataURL } from "./utils/svg.js";

renderSvgToDataURL(icon, 1024, 1024)
  .then((dataURL) => {
    setIcon(dataURL);
  })
  .catch((e) => console.log("unable to render icon", e));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
