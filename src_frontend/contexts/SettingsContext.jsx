import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as ipc from "../utils/ipc";

const SettingsStateContext = createContext(null);
const SettingsActionsContext = createContext(null);

export const useSettingsState = () => useContext(SettingsStateContext);
export const useSettingsActions = () => useContext(SettingsActionsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    ipc
      .getAppConfig()
      .then((config) => {
        setSettings(config || {});
      })
      .catch((err) => {
        ipc.logError("Failed to get initial app config:", err);
        setSettings({});
      });

    const unsubscribe = ipc.onAppConfigChanged((newConfig) => {
      setSettings(newConfig);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
