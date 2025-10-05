const { contextBridge, ipcRenderer } = require("electron");

const ALLOWED_RECEIVE_CHANNELS = [
  "game-started",
  "game-closed",
  "audio-info-changed",
  "bluetooth-state-changed",
  "user-theme-updated",
  "show-toast",
  "update-available",
  "app-config-changed",
];

contextBridge.exposeInMainWorld("electronAPI", {
  // Listeners
  createListener: (channel, cb) => {
    if (!ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
      return;
    }
    const safeCb = (_event, ...args) => cb(...args);
    ipcRenderer.on(channel, safeCb);
    return () => {
      ipcRenderer.removeListener(channel, safeCb);
    };
  },

  // Games
  getGames: () => ipcRenderer.invoke("get-games"),
  launchGame: (gameId) => ipcRenderer.send("launch-game", gameId),
  closeGame: (gameId) => ipcRenderer.send("close-game", gameId),

  // Audio
  getAudioInfo: () => ipcRenderer.invoke("get-audio-info"),
  setAudioVolume: (volumePercent) =>
    ipcRenderer.send("set-audio-volume", volumePercent),
  setAudioMute: (isMuted) => ipcRenderer.send("set-audio-mute", isMuted),
  setDefaultSink: (sinkName) => ipcRenderer.send("set-default-sink", sinkName),

  // Bluetooth
  bluetoothGetState: () => ipcRenderer.invoke("bluetooth-get-state"),
  bluetoothPowerOnAdapter: (adapterPath) =>
    ipcRenderer.send("bluetooth-power-on-adapter", adapterPath),
  bluetoothStartDiscovery: () => ipcRenderer.send("bluetooth-start-discovery"),
  bluetoothStopDiscovery: () => ipcRenderer.send("bluetooth-stop-discovery"),
  bluetoothConnect: (devicePath) =>
    ipcRenderer.send("bluetooth-connect", devicePath),
  bluetoothDisconnect: (devicePath) =>
    ipcRenderer.send("bluetooth-disconnect", devicePath),

  // System & App
  rebootPC: () => ipcRenderer.send("reboot-pc"),
  powerOffPC: () => ipcRenderer.send("poweroff-pc"),
  openLutris: () => ipcRenderer.send("open-lutris"),
  toggleWindowShow: () => ipcRenderer.send("toggle-window-show"),
  openExternalLink: (url) => ipcRenderer.send("open-external-link", url),

  // Config
  getAppConfig: () => ipcRenderer.invoke("get-app-config"),
  setAppConfig: (key, value) => ipcRenderer.send("set-app-config", key, value),

  // Window
  setIcon: (dataURL) => ipcRenderer.send("set-icon", dataURL),

  // Theme
  getUserTheme: () => ipcRenderer.invoke("get-user-theme"),

  // Generic
  log: (level, args) => ipcRenderer.send("log", level, args),
});
