import React from "react";

import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import "./styles/main.css";

if (import.meta.env.DEV) {
  try {
    const { scan } = await import("react-scan");
    scan({ enabled: true });
  } catch (error) {
    console.error("Failed to load react-scan:", error);
  }
}

ReactDOM.createRoot(document.querySelector("#root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
