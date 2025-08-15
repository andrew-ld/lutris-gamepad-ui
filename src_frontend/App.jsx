import { InputProvider } from "./contexts/InputContext";
import { LutrisProvider } from "./contexts/LutrisContext";
import { ModalProvider } from "./contexts/ModalContext";
import { AudioProvider } from "./contexts/AudioContext";
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
            <AppContent />
            <ModalRenderer />
          </AudioProvider>
        </ModalProvider>
      </LutrisProvider>
    </InputProvider>
  );
}

export default App;
