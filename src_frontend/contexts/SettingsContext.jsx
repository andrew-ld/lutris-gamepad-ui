import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useIsMounted } from "../hooks/useIsMounted";
import * as ipc from "../utils/ipc";

const SettingsStateContext = createContext(null);
const SettingsActionsContext = createContext(null);

export const useSettingsState = () => useContext(SettingsStateContext);
export const useSettingsActions = () => useContext(SettingsActionsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    ipc
      .getAppConfig()
      .then((config) => {
        if (isMounted()) {
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
      unsubscribe();
    };
  }, [isMounted]);

  useEffect(() => {
    document.body.classList.toggle(
      "disable-animations",
      Boolean(settings?.DISABLE_ANIMATIONS),
    );
  }, [settings?.DISABLE_ANIMATIONS]);

  const updateSetting = useCallback((key, value) => {
    ipc.setAppConfig(key, value);
  }, []);

  const stateValue = useMemo(() => ({ settings }), [settings]);

  const actionsValue = useMemo(() => ({ updateSetting }), [updateSetting]);

  if (settings === null) {
    return null;
  }

  return (
    <SettingsStateContext.Provider value={stateValue}>
      <SettingsActionsContext.Provider value={actionsValue}>
        {children}
      </SettingsActionsContext.Provider>
    </SettingsStateContext.Provider>
  );
};
