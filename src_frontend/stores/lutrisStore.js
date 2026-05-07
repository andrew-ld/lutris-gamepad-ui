import { useEffect } from "react";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import * as ipc from "../utils/ipc";

const mapLutrisGame = (game) => ({
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
});

export const useLutrisStore = create((set, get) => ({
  games: [],
  loading: true,
  runningGame: null,
  isGamePaused: false,
  fetchGames: async ({ showLoading = true, isActive = () => true } = {}) => {
    if (showLoading) {
      set({ loading: true });
    }

    try {
      const allGames = await ipc.getGames();
      const mappedGames = allGames.map((game) => mapLutrisGame(game));

      if (isActive()) {
        set({ games: mappedGames });
      }
    } catch (error) {
      ipc.logError("Error fetching games in store:", error);
    } finally {
      if (isActive()) {
        set({ loading: false });
      }
    }
  },
  launchGame: (game) => {
    if (get().runningGame) return;
    ipc.launchGame(game);
  },
  closeRunningGame: () => {
    const { runningGame } = get();
    if (!runningGame) return;
    ipc.closeGame(runningGame);
  },
  setRunningGameById: (gameId) => {
    const game = get().games.find((candidate) => candidate.id === gameId);

    if (game) {
      set({ runningGame: game, isGamePaused: false });
    }
  },
  setRunningGame: (runningGame) => set({ runningGame }),
  setGamePaused: (isGamePaused) => set({ isGamePaused }),
}));

export const useLutris = () =>
  useLutrisStore(
    useShallow((state) => ({
      games: state.games,
      loading: state.loading,
      runningGame: state.runningGame,
      isGamePaused: state.isGamePaused,
    })),
  );

export const useLutrisActions = () =>
  useLutrisStore(
    useShallow((state) => ({
      fetchGames: state.fetchGames,
      launchGame: state.launchGame,
      closeRunningGame: state.closeRunningGame,
    })),
  );

export const useInitializeLutrisStore = () => {
  const fetchGames = useLutrisStore((state) => state.fetchGames);
  const setRunningGameById = useLutrisStore(
    (state) => state.setRunningGameById,
  );
  const setRunningGame = useLutrisStore((state) => state.setRunningGame);
  const setGamePaused = useLutrisStore((state) => state.setGamePaused);

  useEffect(() => {
    let isActive = true;

    void fetchGames({
      showLoading: false,
      isActive: () => isActive,
    });

    return () => {
      isActive = false;
    };
  }, [fetchGames]);

  useEffect(() => {
    const handleGameStarted = (gameId) => {
      ipc.logInfo(`[IPC] Received game-started for ID: ${gameId}`);
      setRunningGameById(gameId);
    };

    const handleGameClosed = () => {
      ipc.logInfo("[IPC] Received game-closed");
      setRunningGame(null);
      setGamePaused(false);
      void fetchGames();
    };

    const unsubscribeOnGameStarted = ipc.onGameStarted(handleGameStarted);
    const unsubscribeOnGameClosed = ipc.onGameClosed(handleGameClosed);
    const unsubscribeOnGamePauseStateChanged =
      ipc.onGamePauseStateChanged(setGamePaused);

    return () => {
      unsubscribeOnGameStarted();
      unsubscribeOnGameClosed();
      unsubscribeOnGamePauseStateChanged();
    };
  }, [fetchGames, setRunningGameById, setRunningGame, setGamePaused]);
};
