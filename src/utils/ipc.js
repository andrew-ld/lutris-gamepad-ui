import { parseTimedeltaToSeconds } from "./datetime";

export const getGames = async () => {
  const gamesFromLutris = await window.electronAPI.getGames();

  return gamesFromLutris.map((game) => {
    return {
      id: game.id,
      title: game.name || game.slug,
      playtimeSeconds: game.playtimeSeconds
        ? game.playtimeSeconds
        : parseTimedeltaToSeconds(game.playtime),
      lastPlayed: game.lastplayed ? new Date(game.lastplayed) : null,
      coverPath: game.coverPath,
    };
  });
};

export const launchGame = (game) => {
  console.log(`Requesting launch for game: ${game.title} (ID: ${game.id})`);
  window.electronAPI.launchGame(game.id);
};

export const closeGame = (game) => {
  console.log(`Requesting close for game: ${game.title} (ID: ${game.id})`);
  window.electronAPI.closeGame(game.id);
};

export const setIcon = (dataURL) => {
  window.electronAPI.setIcon(dataURL);
};

export const rebootPC = () => {
  window.electronAPI.rebootPC();
};

export const powerOffPC = () => {
  window.electronAPI.powerOffPC();
};

export const openLutris = () => {
  window.electronAPI.openLutris();
};

export const toggleWindowShow = () => {
  window.electronAPI.toggleWindowShow();
};

export const getAudioInfo = async () => {
  return await window.electronAPI.getAudioInfo();
};

export const setAudioVolume = (volumePercent) => {
  window.electronAPI.setAudioVolume(volumePercent);
};

export const setAudioMute = (isMuted) => {
  window.electronAPI.setAudioMute(isMuted);
};

export const setDefaultSink = (sinkName) => {
  window.electronAPI.setDefaultSink(sinkName);
};

export const openExternalLink = (url) => {
  window.electronAPI.openExternalLink(url);
};
