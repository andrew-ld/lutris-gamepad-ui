import { useMemo } from "react";

import { useSettingsState } from "../stores/settingsStore";
import { useTranslation } from "../stores/translationStore";

const LIBRARY_SORT_MODES = {
  GAME_NAME: "gameName",
  RUNNER_NAME: "runnerName",
  LAST_PLAYED: "lastPlayed",
  RUNNER_LAST_PLAYED: "runnerLastPlayed",
};

const compareByGameName = (a, b) => a.title.localeCompare(b.title);

const compareByLastPlayed = (a, b) => {
  const result =
    (b.lastPlayed?.getTime() || 0) - (a.lastPlayed?.getTime() || 0);

  return result || compareByGameName(a, b);
};

const getRunnerName = (game) =>
  typeof game.runner === "string" ? game.runner.trim() : "";

const compareByRunner = (a, b) => {
  const runnerA = getRunnerName(a);
  const runnerB = getRunnerName(b);

  if (!runnerA && runnerB) return 1;
  if (runnerA && !runnerB) return -1;

  return runnerA.localeCompare(runnerB);
};

const sortGames = (gameList, sortMode) => {
  const compareGames = (() => {
    switch (sortMode) {
      case LIBRARY_SORT_MODES.LAST_PLAYED: {
        return compareByLastPlayed;
      }
      case LIBRARY_SORT_MODES.RUNNER_LAST_PLAYED: {
        return (a, b) => compareByRunner(a, b) || compareByLastPlayed(a, b);
      }
      case LIBRARY_SORT_MODES.RUNNER_NAME: {
        return (a, b) => compareByRunner(a, b) || compareByGameName(a, b);
      }
      default: {
        return compareByGameName;
      }
    }
  })();

  return [...gameList].toSorted(compareGames);
};

export const useGameShelves = (games, searchQuery) => {
  const { t } = useTranslation();
  const { settings } = useSettingsState();

  const currentGames = useMemo(() => {
    return (games || []).filter((g) => {
      if (!settings.showHiddenGames && g.hidden) {
        return false;
      }

      if (
        searchQuery &&
        !g.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [searchQuery, settings.showHiddenGames, games]);

  const shelves = useMemo(() => {
    if (searchQuery) {
      return [
        {
          title: t('Results for "{{searchQuery}}"', { searchQuery }),
          games: sortGames(currentGames, settings.librarySortMode),
        },
      ];
    }

    const newShelves = [];

    if (settings.showRecentlyPlayed) {
      const recentlyPlayedGames = sortGames(
        currentGames,
        LIBRARY_SORT_MODES.LAST_PLAYED,
      ).slice(0, 10);
      if (recentlyPlayedGames.length > 0) {
        newShelves.push({
          title: t("Recently Played"),
          games: recentlyPlayedGames,
        });
      }
    }

    const allGamesSorted = sortGames(currentGames, settings.librarySortMode);
    newShelves.push({ title: t("All Games"), games: allGamesSorted });

    const categoriesMap = new Map();
    for (const game of currentGames) {
      for (const categoryName of game.categories) {
        if (!categoriesMap.has(categoryName)) {
          categoriesMap.set(categoryName, []);
        }
        categoriesMap.get(categoryName).push(game);
      }
    }

    const sortedCategoryNames = [...categoriesMap.keys()].toSorted((a, b) =>
      a.localeCompare(b),
    );

    for (const categoryName of sortedCategoryNames) {
      const categoryGames = categoriesMap.get(categoryName);
      newShelves.push({
        title: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
        games: sortGames(categoryGames, settings.librarySortMode),
      });
    }

    return newShelves;
  }, [
    currentGames,
    searchQuery,
    t,
    settings.showRecentlyPlayed,
    settings.librarySortMode,
  ]);

  return { currentGames, shelves };
};
