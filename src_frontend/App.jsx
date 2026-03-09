import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import ModalRenderer from "./components/ModalRenderer";
import ToastContainer from "./components/ToastContainer";
import Compose from "./components/Compose";
import AppMouseFocus from "./components/AppMouseFocus";
import AppContent from "./components/AppContent";
import { AudioProvider } from "./contexts/AudioContext";
import { BluetoothProvider } from "./contexts/BluetoothContext";
import { InputProvider } from "./contexts/InputContext";
import { LutrisProvider } from "./contexts/LutrisContext";
import { ModalProvider } from "./contexts/ModalContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ToastProvider } from "./contexts/ToastContext";
import { TranslationProvider } from "./contexts/TranslationContext";
import { onThemeUpdated } from "./utils/ipc";
import { reloadApplicationTheme } from "./utils/theme.js";
import { playButtonActionSound } from "./utils/sound.js";

function App() {
  useEffect(() => {
    playButtonActionSound();
    reloadApplicationTheme();
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
