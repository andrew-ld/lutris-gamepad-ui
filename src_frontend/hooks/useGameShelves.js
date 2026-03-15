import { useMemo } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { useSettingsState } from "../contexts/SettingsContext";

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
          games: currentGames.sort((a, b) => a.title.localeCompare(b.title)),
        },
      ];
    }

    const sortByLastPlayed = (gameList) =>
      [...gameList].sort(
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

    const allGamesSorted = [...currentGames].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    newShelves.push({ title: t("All Games"), games: allGamesSorted });

    const categoriesMap = new Map();
    currentGames.forEach((game) => {
      game.categories.forEach((categoryName) => {
        if (!categoriesMap.has(categoryName)) {
          categoriesMap.set(categoryName, []);
        }
        categoriesMap.get(categoryName).push(game);
      });
    });

    const sortedCategoryNames = [...categoriesMap.keys()].sort((a, b) =>
      a.localeCompare(b),
    );

    sortedCategoryNames.forEach((categoryName) => {
      const categoryGames = categoriesMap.get(categoryName);
      newShelves.push({
        title: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
        games: sortByLastPlayed(categoryGames),
      });
    });

    return newShelves;
  }, [currentGames, searchQuery, t, settings.showRecentlyPlayed]);

  return { currentGames, shelves };
};
