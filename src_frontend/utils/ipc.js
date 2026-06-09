import { deserializeGamepads } from "./sdl_gamepad_deserialize";

export const getGames = () => globalThis.electronAPI.getGames();
export const launchGame = (game) => globalThis.electronAPI.launchGame(game.id);
export const closeGame = (game) => globalThis.electronAPI.closeGame(game.id);
export const openLutris = () => globalThis.electronAPI.openLutris();
export const toggleGamePause = () => globalThis.electronAPI.toggleGamePause();

export const rebootPC = () => globalThis.electronAPI.rebootPC();
export const powerOffPC = () => globalThis.electronAPI.powerOffPC();
export const suspendPC = () => globalThis.electronAPI.suspendPC();
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

export const getLutrisSettings = (gameIdentifier, runnerSlug) =>
  globalThis.electronAPI.getLutrisSettings(gameIdentifier, runnerSlug);
export const getLutrisRunners = () => globalThis.electronAPI.getLutrisRunners();
export const syncLutrisAccount = () =>
  globalThis.electronAPI.syncLutrisAccount();
export const getNewGameLutrisSettings = (runnerSlug) =>
  globalThis.electronAPI.getNewGameLutrisSettings(runnerSlug);
export const updateLutrisSetting = (
  section,
  key,
  value,
  type,
  gameIdentifier,
  runnerSlug,
) =>
  globalThis.electronAPI.updateLutrisSetting(
    section,
    key,
    value,
    type,
    gameIdentifier,
    runnerSlug,
  );
export const addLutrisGame = (gameData) =>
  globalThis.electronAPI.addLutrisGame(gameData);

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
export const onThemeUpdated = createSubscriber("user-theme-updated");
export const onShowToast = createSubscriber("show-toast");
export const onUpdateAvailable = createSubscriber("update-available");
export const onAppConfigChanged = createSubscriber("app-config-changed");

export const createBugReportFile = () =>
  globalThis.electronAPI.createBugReportFile();

export const pollGamepadsSdl = () => {
  const data = globalThis.electronAPI.pollGamepadsSdl();
  return data ? deserializeGamepads(data) : null;
};

export function encodeAppProtocolPath(filePath) {
  const sanitizedFilePath = filePath
    .split("/")
    .map((element) => encodeURIComponent(element))
    .join("/");

  return `app://${sanitizedFilePath}`;
}

export const listDirectory = (dirPath, allowFallback = false) =>
  globalThis.electronAPI.listDirectory(dirPath, allowFallback);
