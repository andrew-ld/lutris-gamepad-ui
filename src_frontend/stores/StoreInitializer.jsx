import BootSplash from "../components/BootSplash";

import { useInitializeAudioStore } from "./audioStore";
import { useInitializeInputStore } from "./inputStore";
import { useInitializeLutrisStore } from "./lutrisStore";
import { useInitializeSettingsStore, useSettingsStore } from "./settingsStore";
import { useInitializeTranslationStore } from "./translationStore";

const AudioStoreRuntime = () => {
  useInitializeAudioStore();
  return null;
};

const StoreRuntime = ({ children, staticSettings }) => {
  useInitializeInputStore();
  useInitializeTranslationStore();
  useInitializeLutrisStore();

  return (
    <>
      {!staticSettings.DISABLE_AUDIO_SETTINGS && <AudioStoreRuntime />}
      {children}
    </>
  );
};

const StoreInitializer = ({ children, staticSettings }) => {
  useInitializeSettingsStore();

  const isSettingsReady = useSettingsStore((state) => state.settings !== null);

  if (!isSettingsReady) {
    return <BootSplash />;
  }

  return (
    <StoreRuntime staticSettings={staticSettings}>{children}</StoreRuntime>
  );
};

export default StoreInitializer;
