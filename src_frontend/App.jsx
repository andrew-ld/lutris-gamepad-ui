import AppContent from "./components/AppContent";
import AppInitializer from "./components/AppInitializer";
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
import { UIProvider } from "./contexts/UIContext";

function App() {
  const providers = [
    SettingsProvider,
    UIProvider,
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
    <AppInitializer>
      <Compose components={providers}>
        <AppContent />
        <ModalRenderer />
        <ToastContainer />
      </Compose>
    </AppInitializer>
  );
}

export default App;
