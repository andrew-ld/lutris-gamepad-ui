export const getGames = () => window.electronAPI.getGames();
export const launchGame = (game) => window.electronAPI.launchGame(game.id);
export const closeGame = (game) => window.electronAPI.closeGame(game.id);
export const openLutris = () => window.electronAPI.openLutris();

export const setIcon = (dataURL) => window.electronAPI.setIcon(dataURL);
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

export const onGameStarted = (cb) => window.electronAPI.onGameStarted(cb);
export const onGameClosed = (cb) => window.electronAPI.onGameClosed(cb);
export const onAudioInfoChanged = (cb) =>
  window.electronAPI.onAudioInfoChanged(cb);
export const onBluetoothStateChanged = (cb) =>
  window.electronAPI.onBluetoothStateChanged(cb);
export const removeAllListeners = (channel) =>
  window.electronAPI.removeAllListeners(channel);

export const logInfo = (...args) => window.electronAPI.log("info", args);
export const logWarn = (...args) => window.electronAPI.log("warn", args);
export const logError = (...args) => window.electronAPI.log("error", args);

export const getUserTheme = () => window.electronAPI.getUserTheme();
export const onThemeUpdated = (cb) => window.electronAPI.onThemeUpdated(cb);
