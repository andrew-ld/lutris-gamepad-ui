import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as ipc from "../utils/ipc";
import { useIsMounted } from "../hooks/useIsMounted";

const LutrisContext = createContext(null);
export const useLutris = () => useContext(LutrisContext);

export const LutrisProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningGame, setRunningGame] = useState(null);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const isMounted = useIsMounted();

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const allGames = await ipc.getGames();

      const mappedGames = allGames.map((game) => ({
        id: game.id,
        title: game.name || game.slug,
        playtimeSeconds: game.playtime * 3600,
        lastPlayed: game.lastplayed ? new Date(game.lastplayed * 1000) : null,
        coverPath: game.coverPath,
        runtimeIconPath: game.runtimeIconPath || null,
        categories: game.categories || [],
        hidden: game.hidden || false,
      }));

      if (isMounted()) {
        setGames(mappedGames);
      }
    } catch (error) {
      ipc.logError("Error fetching games in context:", error);
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const handleGameStarted = (gameId) => {
      ipc.logInfo(`[IPC] Received game-started for ID: ${gameId}`);
      const game = games.find((g) => g.id === gameId);
      if (game) {
        setRunningGame(game);
        setIsGamePaused(false);
      }
    };

    const handleGameClosed = () => {
      ipc.logInfo("[IPC] Received game-closed");
      setRunningGame(null);
      setIsGamePaused(false);
      fetchGames();
    };

    const handleGamePauseStateChanged = (paused) => {
      setIsGamePaused(paused);
    };

    const unsubscribeOnGameStarted = ipc.onGameStarted(handleGameStarted);
    const unsubscribeOnGameClosed = ipc.onGameClosed(handleGameClosed);
    const unsubscribeOnGamePauseStateChanged = ipc.onGamePauseStateChanged(
      handleGamePauseStateChanged,
    );

    return () => {
      unsubscribeOnGameStarted();
      unsubscribeOnGameClosed();
      unsubscribeOnGamePauseStateChanged();
    };
  }, [games, fetchGames]);

  const launchGame = useCallback(
    (game) => {
      if (runningGame) return;
      ipc.launchGame(game);
    },
    [runningGame],
  );

  const closeRunningGame = useCallback(() => {
    if (!runningGame) return;
    ipc.closeGame(runningGame);
  }, [runningGame]);

  const value = {
    games,
    loading,
    runningGame,
    isGamePaused,
    fetchGames,
    launchGame,
    closeRunningGame,
  };

  return (
    <LutrisContext.Provider value={value}>{children}</LutrisContext.Provider>
  );
};
