export const getGames = () => window.electronAPI.getGames();
export const launchGame = (game) => window.electronAPI.launchGame(game.id);
export const closeGame = (game) => window.electronAPI.closeGame(game.id);
export const openLutris = () => window.electronAPI.openLutris();

export const rebootPC = () => window.electronAPI.rebootPC();
export const powerOffPC = () => window.electronAPI.powerOffPC();
export const toggleWindowShow = () => window.electronAPI.toggleWindowShow();
export const openExternalLink = (url) =>
  window.electronAPI.openExternalLink(url);

export const getAudioInfo = () => window.electronAPI.getAudioInfo();
export const setAudioVolume = (volume) =>
  window.electronAPI.setAudioVolume(volume);
export const setAudioMute = (isMuted) =>
  window.electronAPI.setAudioMute(isMuted);
export const setDefaultSink = (sinkName) =>
  window.electronAPI.setDefaultSink(sinkName);

export const bluetoothGetState = () => window.electronAPI.bluetoothGetState();
export const bluetoothPowerOnAdapter = (path) =>
  window.electronAPI.bluetoothPowerOnAdapter(path);
export const bluetoothStartDiscovery = () =>
  window.electronAPI.bluetoothStartDiscovery();
export const bluetoothStopDiscovery = () =>
  window.electronAPI.bluetoothStopDiscovery();
export const bluetoothConnect = (path) =>
  window.electronAPI.bluetoothConnect(path);
export const bluetoothDisconnect = (path) =>
  window.electronAPI.bluetoothDisconnect(path);

export const logInfo = (...args) => window.electronAPI.log("info", args);
export const logWarn = (...args) => window.electronAPI.log("warn", args);
export const logError = (...args) => window.electronAPI.log("error", args);

export const getUserTheme = () => window.electronAPI.getUserTheme();

export const setIcon = (dataURL) => window.electronAPI.setIcon(dataURL);

export const getAppConfig = () => window.electronAPI.getAppConfig();
export const setAppConfig = (key, value) =>
  window.electronAPI.setAppConfig(key, value);

const createSubscriber = (channel) => (cb) => {
  return window.electronAPI.createListener(channel, cb);
};

export const onGameStarted = createSubscriber("game-started");
export const onGameClosed = createSubscriber("game-closed");
export const onAudioInfoChanged = createSubscriber("audio-info-changed");
export const onBluetoothStateChanged = createSubscriber(
  "bluetooth-state-changed"
);
export const onThemeUpdated = createSubscriber("user-theme-updated");
export const onShowToast = createSubscriber("show-toast");
export const onUpdateAvailable = createSubscriber("update-available");
export const onAppConfigChanged = createSubscriber("app-config-changed");
