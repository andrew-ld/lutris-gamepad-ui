const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getGames: () => ipcRenderer.invoke("get-games"),
  getAudioInfo: () => ipcRenderer.invoke("get-audio-info"),
  launchGame: (gameId) => ipcRenderer.send("launch-game", gameId),
  closeGame: (gameId) => ipcRenderer.send("close-game", gameId),
  setIcon: (dataURL) => ipcRenderer.send("set-icon", dataURL),
  rebootPC: () => ipcRenderer.send("reboot-pc"),
  powerOffPC: () => ipcRenderer.send("poweroff-pc"),
  openLutris: () => ipcRenderer.send("open-lutris"),
  toggleWindowShow: () => ipcRenderer.send("toggle-window-show"),
  setAudioVolume: (volumePercent) =>
    ipcRenderer.send("set-audio-volume", volumePercent),
  setAudioMute: (isMuted) => ipcRenderer.send("set-audio-mute", isMuted),
  setDefaultSink: (sinkName) => ipcRenderer.send("set-default-sink", sinkName),

  onGameStarted: (callback) =>
    ipcRenderer.on("game-started", (_event, ...args) => callback(...args)),
  onGameClosed: (callback) =>
    ipcRenderer.on("game-closed", (_event, ...args) => callback(...args)),
  onAudioInfoChanged: (callback) =>
    ipcRenderer.on("audio-info-changed", (_event, ...args) =>
      callback(...args)
    ),
  openExternalLink: (url) => ipcRenderer.send("open-external-link", url),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  log: (level, args) => ipcRenderer.send("log", level, args),
});
