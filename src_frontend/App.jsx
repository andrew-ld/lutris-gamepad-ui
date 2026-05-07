import AppContent from "./components/AppContent";
import AppInitializer from "./components/AppInitializer";
import ErrorBoundary from "./components/ErrorBoundary";
import ModalRenderer from "./components/ModalRenderer";
import ToastContainer from "./components/ToastContainer";
import { useStaticSettings } from "./hooks/useStaticSettings";
import StoreInitializer from "./stores/StoreInitializer";

function App() {
  const { staticSettings } = useStaticSettings();

  return (
    <AppInitializer>
      <StoreInitializer staticSettings={staticSettings}>
        <ErrorBoundary>
          <AppContent />
          <ModalRenderer />
          <ToastContainer />
        </ErrorBoundary>
      </StoreInitializer>
    </AppInitializer>
  );
}

export default App;
