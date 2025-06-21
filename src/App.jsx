import { InputProvider } from "./contexts/InputContext";
import { LutrisProvider } from "./contexts/LutrisContext";
import { ModalProvider } from "./contexts/ModalContext";
import LibraryContainer from "./components/LibraryContainer";
import { LibraryContainerFocusID } from "./components/LibraryContainer";
import SystemMenu from "./components/SystemMenu";
import ModalRenderer from "./components/ModalRenderer";

const AppContent = () => {
  return (
    <div className="App">
      <SystemMenu />
      <LibraryContainer />
    </div>
  );
};

function App() {
  return (
    <InputProvider defaultFocusId={LibraryContainerFocusID}>
      <LutrisProvider>
        <ModalProvider>
          <AppContent />
          <ModalRenderer />
        </ModalProvider>
      </LutrisProvider>
    </InputProvider>
  );
}

export default App;
