const { setKvStoreValue, getKvStoreValue } = require("./storage_kv.cjs");
const { getMainWindow } = require("./state.cjs");

const CONFIG_KEY = "app_config";

const defaultConfig = {
  zoomFactor: 1.0,
  showRecentlyPlayed: true,
  showHiddenGames: false,
  doubleConfirmPowerManagement: true,
};

const SUBSCRIPTIONS = {};

function getAppConfig() {
  const storedConfig = getKvStoreValue(CONFIG_KEY);
  return { ...defaultConfig, ...(storedConfig || {}) };
}

function subscribeConfigValueChange(key, cb) {
  const subscribers = (SUBSCRIPTIONS[key] = SUBSCRIPTIONS[key] || []);
  subscribers.push(cb);
}

function setAppConfig(key, value) {
  const currentConfig = getAppConfig();
  const newConfig = { ...currentConfig, [key]: value };
  setKvStoreValue(CONFIG_KEY, newConfig);

  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send("app-config-changed", newConfig);
  }

  subscribers = SUBSCRIPTIONS[key];
  if (subscribers) {
    subscribers.forEach((cb) => cb(value));
  }

  return newConfig;
}

module.exports = { getAppConfig, setAppConfig, subscribeConfigValueChange };
