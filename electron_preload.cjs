const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Games
  getGames: () => ipcRenderer.invoke("get-games"),
  launchGame: (gameId) => ipcRenderer.send("launch-game", gameId),
  closeGame: (gameId) => ipcRenderer.send("close-game", gameId),
  onGameStarted: (callback) =>
    ipcRenderer.on("game-started", (_event, ...args) => callback(...args)),
  onGameClosed: (callback) =>
    ipcRenderer.on("game-closed", (_event, ...args) => callback(...args)),

  // Audio
  getAudioInfo: () => ipcRenderer.invoke("get-audio-info"),
  setAudioVolume: (volumePercent) =>
    ipcRenderer.send("set-audio-volume", volumePercent),
  setAudioMute: (isMuted) => ipcRenderer.send("set-audio-mute", isMuted),
  setDefaultSink: (sinkName) => ipcRenderer.send("set-default-sink", sinkName),
  onAudioInfoChanged: (callback) =>
    ipcRenderer.on("audio-info-changed", (_event, ...args) =>
      callback(...args)
    ),

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
  onBluetoothStateChanged: (callback) =>
    ipcRenderer.on("bluetooth-state-changed", (_event, ...args) =>
      callback(...args)
    ),

  // System & App
  rebootPC: () => ipcRenderer.send("reboot-pc"),
  powerOffPC: () => ipcRenderer.send("poweroff-pc"),
  openLutris: () => ipcRenderer.send("open-lutris"),
  toggleWindowShow: () => ipcRenderer.send("toggle-window-show"),
  setIcon: (dataURL) => ipcRenderer.send("set-icon", dataURL),
  openExternalLink: (url) => ipcRenderer.send("open-external-link", url),

  // Theme
  getUserTheme: () => ipcRenderer.invoke("get-user-theme"),
  onThemeUpdated: (callback) =>
    ipcRenderer.on("user-theme-updated", () => callback()),

  // Generic
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  log: (level, args) => ipcRenderer.send("log", level, args),
});
