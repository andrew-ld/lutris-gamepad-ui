import { useEffect } from "react";

import AppContent from "./components/AppContent";
import AppMouseFocus from "./components/AppMouseFocus";
import Compose from "./components/Compose";
import ErrorBoundary from "./components/ErrorBoundary";
import ModalRenderer from "./components/ModalRenderer";
import ToastContainer from "./components/ToastContainer";
import { AudioProvider } from "./contexts/AudioContext";
import { BluetoothProvider } from "./contexts/BluetoothContext";
import { InputProvider } from "./contexts/InputContext";
import { LutrisProvider } from "./contexts/LutrisContext";
import { ModalProvider } from "./contexts/ModalContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ToastProvider } from "./contexts/ToastContext";
import { TranslationProvider } from "./contexts/TranslationContext";
import icon from "./resources/icon.svg";
import { onThemeUpdated, logError, setIcon } from "./utils/ipc";
import { playButtonActionSound } from "./utils/sound.js";
import { renderSvgToDataURL } from "./utils/svg.js";
import { reloadApplicationTheme } from "./utils/theme.js";

function App() {
  useEffect(() => {
    playButtonActionSound();

    reloadApplicationTheme();

    renderSvgToDataURL(icon, 256, 256)
      .then((dataURL) => {
        setIcon(dataURL);
      })
      .catch((error) => logError("unable to render icon", error));

    return onThemeUpdated(() => reloadApplicationTheme());
  }, []);

  const providers = [
    SettingsProvider,
    InputProvider,
    TranslationProvider,
    ErrorBoundary,
    LutrisProvider,
    ModalProvider,
    AudioProvider,
    BluetoothProvider,
    ToastProvider,
  ];

  return (
    <Compose components={providers}>
      <AppMouseFocus />
      <AppContent />
      <ModalRenderer />
      <ToastContainer />
    </Compose>
  );
}

export default App;
