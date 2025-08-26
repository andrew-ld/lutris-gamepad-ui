import { useEffect } from "react";
import { InputProvider, useInput } from "./contexts/InputContext";
import { LutrisProvider } from "./contexts/LutrisContext";
import { ModalProvider } from "./contexts/ModalContext";
import { AudioProvider } from "./contexts/AudioContext";
import { BluetoothProvider } from "./contexts/BluetoothContext";
import LibraryContainer from "./components/LibraryContainer";
import SystemMenu from "./components/SystemMenu";
import ModalRenderer from "./components/ModalRenderer";
import TopBar from "./components/TopBar";
import ErrorBoundary from "./components/ErrorBoundary";
import { TranslationProvider } from "./contexts/TranslationContext";

const AppMouseFocus = () => {
  const { subscribe } = useInput();

  useEffect(() => {
    let timeoutId;

    const handleMouseMove = () => {
      document.body.classList.add("mouse-active");
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        document.body.classList.remove("mouse-active");
      }, 500);
    };

    const handleGameInput = () => {
      if (document.body.classList.contains("mouse-active")) {
        clearTimeout(timeoutId);
        document.body.classList.remove("mouse-active");
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    const unsubscribe = subscribe(handleGameInput);

    document.body.classList.remove("mouse-active");

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [subscribe]);
};

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
      <AppMouseFocus />
      <TranslationProvider>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </TranslationProvider>
    </InputProvider>
  );
}

export default App;
