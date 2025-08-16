import { InputProvider } from "./contexts/InputContext";
import { LutrisProvider } from "./contexts/LutrisContext";
import { ModalProvider } from "./contexts/ModalContext";
import { AudioProvider } from "./contexts/AudioContext";
import { BluetoothProvider } from "./contexts/BluetoothContext";
import LibraryContainer from "./components/LibraryContainer";
import SystemMenu from "./components/SystemMenu";
import ModalRenderer from "./components/ModalRenderer";
import TopBar from "./components/TopBar";

const AppContent = () => {
  return (
    <div className="App">
      <TopBar />
      <SystemMenu />
      <LibraryContainer />
    </div>
  );
};

function App() {
  return (
    <InputProvider>
      <LutrisProvider>
        <ModalProvider>
          <AudioProvider>
            <BluetoothProvider>
              <AppContent />
              <ModalRenderer />
            </BluetoothProvider>
          </AudioProvider>
        </ModalProvider>
      </LutrisProvider>
    </InputProvider>
  );
}

export default App;
