import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as ipc from "../utils/ipc";
import { parseTimedeltaToSeconds } from "../utils/datetime";

const LutrisContext = createContext(null);
export const useLutris = () => useContext(LutrisContext);

export const LutrisProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningGame, setRunningGame] = useState(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const allGames = await ipc.getGames();

      const mappedGames = allGames.map((game) => ({
        id: game.id,
        title: game.name || game.slug,
        playtimeSeconds: game.playtimeSeconds
          ? game.playtimeSeconds
          : parseTimedeltaToSeconds(game.playtime),
        lastPlayed: game.lastplayed ? new Date(game.lastplayed) : null,
        coverPath: game.coverPath,
      }));

      setGames(mappedGames);
    } catch (error) {
      ipc.logError("Error fetching games in context:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const handleGameStarted = (gameId) => {
      ipc.logInfo(`[IPC] Received game-started for ID: ${gameId}`);
      const game = games.find((g) => g.id === gameId);
      if (game) {
        setRunningGame(game);
      }
    };

    const handleGameClosed = () => {
      ipc.logInfo("[IPC] Received game-closed");
      setRunningGame(null);
      fetchGames();
    };

    ipc.onGameStarted(handleGameStarted);
    ipc.onGameClosed(handleGameClosed);

    return () => {
      ipc.removeAllListeners("game-started");
      ipc.removeAllListeners("game-closed");
    };
  }, [games, fetchGames]);

  const launchGame = useCallback(
    (game) => {
      if (runningGame) return;
      ipc.launchGame(game);
    },
    [runningGame]
  );

  const closeRunningGame = useCallback(() => {
    if (!runningGame) return;
    ipc.closeGame(runningGame);
  }, [runningGame]);

  const value = {
    games,
    loading,
    runningGame,
    fetchGames,
    launchGame,
    closeRunningGame,
  };

  return (
    <LutrisContext.Provider value={value}>{children}</LutrisContext.Provider>
  );
};
