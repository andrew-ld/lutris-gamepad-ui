import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as api from "../utils/ipc";

const LutrisContext = createContext(null);
export const useLutris = () => useContext(LutrisContext);

export const LutrisProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningGame, setRunningGame] = useState(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const allGames = await api.getGames();
      setGames(allGames);
    } catch (error) {
      console.error("Error fetching games in context:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const handleGameStarted = (gameId) => {
      console.log(`[IPC] Received game-started for ID: ${gameId}`);
      const game = games.find((g) => g.id === gameId);
      if (game) {
        setRunningGame(game);
      }
    };

    const handleGameClosed = () => {
      console.log("[IPC] Received game-closed");
      setRunningGame(null);
      fetchGames();
    };

    window.electronAPI.onGameStarted(handleGameStarted);
    window.electronAPI.onGameClosed(handleGameClosed);

    return () => {
      window.electronAPI.removeAllListeners("game-started");
      window.electronAPI.removeAllListeners("game-closed");
    };
  }, [games, fetchGames]);

  const launchGame = useCallback(
    (game) => {
      if (runningGame) return;
      api.launchGame(game);
    },
    [runningGame]
  );

  const closeRunningGame = useCallback(() => {
    if (!runningGame) return;
    api.closeGame(runningGame);
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
