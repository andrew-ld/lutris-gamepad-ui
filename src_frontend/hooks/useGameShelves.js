import { useMemo } from "react";

import { useSettingsState } from "../contexts/SettingsContext";
import { useTranslation } from "../contexts/TranslationContext";

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
          games: currentGames.toSorted((a, b) =>
            a.title.localeCompare(b.title),
          ),
        },
      ];
    }

    const sortByLastPlayed = (gameList) =>
      [...gameList].toSorted(
        (a, b) =>
          (b.lastPlayed?.getTime() || 0) - (a.lastPlayed?.getTime() || 0),
      );

    const newShelves = [];

    if (settings.showRecentlyPlayed) {
      const recentlyPlayedGames = sortByLastPlayed(currentGames).slice(0, 10);
      if (recentlyPlayedGames.length > 0) {
        newShelves.push({
          title: t("Recently Played"),
          games: recentlyPlayedGames,
        });
      }
    }

    const allGamesSorted = [...currentGames].toSorted((a, b) =>
      a.title.localeCompare(b.title),
    );
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
        games: sortByLastPlayed(categoryGames),
      });
    }

    return newShelves;
  }, [currentGames, searchQuery, t, settings.showRecentlyPlayed]);

  return { currentGames, shelves };
};
