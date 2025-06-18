import { useEffect } from "react";
import { InputProvider, useInput } from "./contexts/InputContext";
import { LutrisProvider } from "./contexts/LutrisContext"; // Import provider
import LibraryContainer from "./components/LibraryContainer";
import CloseButton from "./components/CloseButton";

const AppContent = () => {
  const lastInput = useInput();

  useEffect(() => {
    if (lastInput?.name === "Y") {
      window.close();
    }
  }, [lastInput]);

  return (
    <div className="App">
      <CloseButton />
      <LibraryContainer />
    </div>
  );
};

function App() {
  return (
    <InputProvider>
      <LutrisProvider>
        <AppContent />
      </LutrisProvider>
    </InputProvider>
  );
}

export default App;
