import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useIsMounted } from "../hooks/useIsMounted";
import * as ipc from "../utils/ipc";

const LutrisStateContext = createContext(null);
const LutrisActionsContext = createContext(null);

export const useLutris = () => useContext(LutrisStateContext);
export const useLutrisActions = () => useContext(LutrisActionsContext);

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
        slug: game.slug,
        runner: game.runner,
        title: game.name || game.slug,
        playtimeSeconds: (game.playtime || 0) * 3600,
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

  const stateValue = useMemo(
    () => ({
      games,
      loading,
      runningGame,
      isGamePaused,
    }),
    [games, loading, runningGame, isGamePaused],
  );

  const actionsValue = useMemo(
    () => ({
      fetchGames,
      launchGame,
      closeRunningGame,
    }),
    [fetchGames, launchGame, closeRunningGame],
  );

  return (
    <LutrisStateContext.Provider value={stateValue}>
      <LutrisActionsContext.Provider value={actionsValue}>
        {children}
      </LutrisActionsContext.Provider>
    </LutrisStateContext.Provider>
  );
};
