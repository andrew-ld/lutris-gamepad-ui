const { getMainWindow } = require("./state.cjs");
const { setKvStoreValue, getKvStoreValue } = require("./storage_kv.cjs");

const CONFIG_KEY = "app_config";

const defaultConfig = {
  zoomFactor: 1,
  showRecentlyPlayed: true,
  showHiddenGames: false,
  doubleConfirmPowerManagement: true,
  gamepadAutorepeatMs: 225,
  useRemoteDesktopPortal: true,
  showRunnerIcon: true,
  keepGamesRunningOnQuit: false,
  enableUiActionSoundFeedbacks: true,
  controllerInputMode: "native",
};

const SUBSCRIPTIONS = {};

function getAppConfig() {
  const storedConfig = getKvStoreValue(CONFIG_KEY);
  return { ...defaultConfig, ...storedConfig };
}

function subscribeConfigValueChange(key, callback) {
  const subscribers = (SUBSCRIPTIONS[key] = SUBSCRIPTIONS[key] || []);
  subscribers.push(callback);
}

function setAppConfig(key, value) {
  const currentConfig = getAppConfig();
  const newConfig = { ...currentConfig, [key]: value };
  setKvStoreValue(CONFIG_KEY, newConfig);

  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send("app-config-changed", newConfig);
  }

  const subscribers = SUBSCRIPTIONS[key];
  if (subscribers) {
    for (const callback of subscribers) callback(value);
  }

  return newConfig;
}

module.exports = { getAppConfig, setAppConfig, subscribeConfigValueChange };
