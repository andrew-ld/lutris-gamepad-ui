export const getGames = () => globalThis.electronAPI.getGames();
export const launchGame = (game) => globalThis.electronAPI.launchGame(game.id);
export const closeGame = (game) => globalThis.electronAPI.closeGame(game.id);
export const openLutris = () => globalThis.electronAPI.openLutris();
export const toggleGamePause = () => globalThis.electronAPI.toggleGamePause();

export const rebootPC = () => globalThis.electronAPI.rebootPC();
export const powerOffPC = () => globalThis.electronAPI.powerOffPC();
export const toggleWindowShow = () => globalThis.electronAPI.toggleWindowShow();
export const openExternalLink = (url) =>
  globalThis.electronAPI.openExternalLink(url);

export const getAudioInfo = () => globalThis.electronAPI.getAudioInfo();
export const setAudioVolume = (volume) =>
  globalThis.electronAPI.setAudioVolume(volume);
export const setAudioMute = (isMuted) =>
  globalThis.electronAPI.setAudioMute(isMuted);
export const setDefaultSink = (sinkName) =>
  globalThis.electronAPI.setDefaultSink(sinkName);

export const bluetoothGetState = () =>
  globalThis.electronAPI.bluetoothGetState();
export const bluetoothPowerOnAdapter = (path) =>
  globalThis.electronAPI.bluetoothPowerOnAdapter(path);
export const bluetoothStartDiscovery = () =>
  globalThis.electronAPI.bluetoothStartDiscovery();
export const bluetoothStopDiscovery = () =>
  globalThis.electronAPI.bluetoothStopDiscovery();
export const bluetoothConnect = (path) =>
  globalThis.electronAPI.bluetoothConnect(path);
export const bluetoothDisconnect = (path) =>
  globalThis.electronAPI.bluetoothDisconnect(path);

export const getBrightness = () => globalThis.electronAPI.getBrightness();
export const setBrightness = (brightness) =>
  globalThis.electronAPI.setBrightness(brightness);
export const getNightLight = () => globalThis.electronAPI.getNightLight();
export const setNightLight = (enabled) =>
  globalThis.electronAPI.setNightLight(enabled);

export const logInfo = (...arguments_) =>
  globalThis.electronAPI.log("info", arguments_);
export const logWarn = (...arguments_) =>
  globalThis.electronAPI.log("warn", arguments_);
export const logError = (...arguments_) =>
  globalThis.electronAPI.log("error", arguments_);

export const getUserTheme = () => globalThis.electronAPI.getUserTheme();

export const getLutrisSettings = (gameSlug, runnerSlug) =>
  globalThis.electronAPI.getLutrisSettings(gameSlug, runnerSlug);
export const getLutrisRunners = () => globalThis.electronAPI.getLutrisRunners();
export const updateLutrisSetting = (
  section,
  key,
  value,
  type,
  gameSlug,
  runnerSlug,
) =>
  globalThis.electronAPI.updateLutrisSetting(
    section,
    key,
    value,
    type,
    gameSlug,
    runnerSlug,
  );

export const setIcon = (dataURL) => globalThis.electronAPI.setIcon(dataURL);

export const getAppConfig = () => globalThis.electronAPI.getAppConfig();
export const setAppConfig = (key, value) =>
  globalThis.electronAPI.setAppConfig(key, value);

const createSubscriber = (channel) => (callback) => {
  return globalThis.electronAPI.createListener(channel, callback);
};

export const onGameStarted = createSubscriber("game-started");
export const onGameClosed = createSubscriber("game-closed");
export const onGamePauseStateChanged = createSubscriber(
  "game-pause-state-changed",
);
export const onAudioInfoChanged = createSubscriber("audio-info-changed");
export const onBluetoothStateChanged = createSubscriber(
  "bluetooth-state-changed",
);
export const onThemeUpdated = createSubscriber("user-theme-updated");
export const onShowToast = createSubscriber("show-toast");
export const onUpdateAvailable = createSubscriber("update-available");
export const onAppConfigChanged = createSubscriber("app-config-changed");

export const createBugReportFile = () =>
  globalThis.electronAPI.createBugReportFile();
