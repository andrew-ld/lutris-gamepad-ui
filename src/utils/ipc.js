const { ipcRenderer } = window.require("electron");

export const getGames = async () => {
  const gamesFromLutris = await ipcRenderer.invoke("get-games");

  if (!Array.isArray(gamesFromLutris)) {
    return [];
  }

  return gamesFromLutris.map((game) => ({
    id: game.id,
    title: game.name || game.slug,
    playtime: game.playtime,
    lastPlayed: game.lastplayed ? new Date(game.lastplayed) : null,
  }));
};

export const launchGame = (game) => {
  console.log(`Requesting launch for game: ${game.title} (ID: ${game.id})`);
  ipcRenderer.send("launch-game", game.id);
};

export const closeGame = (game) => {
  console.log(`Requesting close for game: ${game.title} (ID: ${game.id})`);
  ipcRenderer.send("close-game", game.id);
};

export const setIcon = (dataURL) => {
  ipcRenderer.send("set-icon", dataURL);
};

export const rebootPC = () => {
  ipcRenderer.send("reboot-pc");
};

export const powerOffPC = () => {
  ipcRenderer.send("poweroff-pc");
};

export const openLutris = () => {
  ipcRenderer.send("open-lutris");
};
