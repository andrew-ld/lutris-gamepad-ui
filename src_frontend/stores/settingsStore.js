import { useEffect } from "react";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import * as ipc from "../utils/ipc";

export const useSettingsStore = create((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
  updateSetting: (key, value) => {
    ipc.setAppConfig(key, value);
  },
}));

export const useSettingsState = () =>
  useSettingsStore(
    useShallow((state) => ({
      settings: state.settings,
    })),
  );

export const useSettingsActions = () =>
  useSettingsStore(
    useShallow((state) => ({
      updateSetting: state.updateSetting,
    })),
  );

export const useInitializeSettingsStore = () => {
  const setSettings = useSettingsStore((state) => state.setSettings);

  useEffect(() => {
    let isActive = true;

    ipc
      .getAppConfig()
      .then((config) => {
        if (isActive) {
          setSettings(config);
        }
      })
      .catch((error) => {
        ipc.logError("Failed to get initial app config:", error);
      });

    const unsubscribe = ipc.onAppConfigChanged((newConfig) => {
      setSettings(newConfig);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [setSettings]);
};
