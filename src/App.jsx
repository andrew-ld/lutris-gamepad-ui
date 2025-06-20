import { InputProvider } from "./contexts/InputContext";
import { LutrisProvider } from "./contexts/LutrisContext";
import LibraryContainer from "./components/LibraryContainer";
import { LibraryContainerFocusID } from "./components/LibraryContainer";
import SystemMenu from "./components/SystemMenu";

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
        <AppContent />
      </LutrisProvider>
    </InputProvider>
  );
}

export default App;
