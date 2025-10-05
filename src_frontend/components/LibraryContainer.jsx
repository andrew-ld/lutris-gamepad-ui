import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLutris } from "../contexts/LutrisContext";
import { useModalActions, useModalState } from "../contexts/ModalContext";
import GameLibrary from "./GameLibrary";
import LoadingIndicator from "./LoadingIndicator";
import RunningGame from "./RunningGame";
import ControlsOverlay from "./ControlsOverlay";
import OnScreenKeyboard from "./OnScreenKeyboard";
import { playActionSound } from "../utils/sound";
import { toggleWindowShow } from "../utils/ipc";
import ConfirmationDialog from "./ConfirmationDialog";
import { useScopedInput } from "../hooks/useScopedInput";
import { useGlobalShortcut } from "../hooks/useGlobalShortcut";
import { useTranslation } from "../contexts/TranslationContext";
import { useSettingsState } from "../contexts/SettingsContext";

export const LibraryContainerFocusID = "LibraryContainer";

const LibraryContainer = () => {
  const { t } = useTranslation();
  const { settings } = useSettingsState();
  const { games, loading, runningGame, launchGame, closeRunningGame } =
    useLutris();

  const [focusCoords, setFocusCoords] = useState({ shelf: 0, card: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [numColumns, setNumColumns] = useState(0);
  const { showModal } = useModalActions();
  const { isModalOpen } = useModalState();

  const libraryContainerRef = useRef(null);
  const cardRefs = useRef([[]]);
  const shelfRefs = useRef([]);
  const gridRefs = useRef([]);
  const gameCloseCloseModalRef = useRef(null);
  const prevFocusCoords = useRef(null);

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

  const setShelfRef = useCallback((el, shelfIndex) => {
    shelfRefs.current[shelfIndex] = el;
  }, []);

  const setCardRef = useCallback((el, shelfIndex, cardIndex) => {
    if (!cardRefs.current[shelfIndex]) {
      cardRefs.current[shelfIndex] = [];
    }
    cardRefs.current[shelfIndex][cardIndex] = el;
  }, []);

  const setGridRef = useCallback((el, shelfIndex) => {
    gridRefs.current[shelfIndex] = el;
  }, []);

  const shelves = useMemo(() => {
    if (searchQuery) {
      const searchShelves = [
        {
          title: t('Results for "{{searchQuery}}"', { searchQuery }),
          games: currentGames.sort((a, b) => a.title.localeCompare(b.title)),
        },
      ];
      cardRefs.current = searchShelves.map((shelf) =>
        Array(shelf.games.length)
      );
      return searchShelves;
    }

    const sortByLastPlayed = (gameList) =>
      [...gameList].sort(
        (a, b) =>
          (b.lastPlayed?.getTime() || 0) - (a.lastPlayed?.getTime() || 0)
      );

    const newShelves = [];

    if (settings.showRecentlyPlayed) {
      const recentlyPlayedGames = sortByLastPlayed(currentGames).slice(0, 10);
      if (recentlyPlayedGames.length > 0) {
        newShelves.push({
          title: "Recently Played",
          games: recentlyPlayedGames,
        });
      }
    }

    const allGamesSorted = currentGames.sort((a, b) =>
      a.title.localeCompare(b.title)
    );
    newShelves.push({ title: "All Games", games: allGamesSorted });

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
      a.localeCompare(b)
    );

    sortedCategoryNames.forEach((categoryName) => {
      const categoryGames = categoriesMap.get(categoryName);
      newShelves.push({
        title: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
        games: sortByLastPlayed(categoryGames),
      });
    });

    cardRefs.current = newShelves.map((shelf) => Array(shelf.games.length));

    return newShelves;
  }, [currentGames, searchQuery, t, settings.showRecentlyPlayed]);

  const shelvesRef = useRef(shelves);
  shelvesRef.current = shelves;

  const focusCoordsRef = useRef(focusCoords);
  focusCoordsRef.current = focusCoords;

  useEffect(() => {
    const calculateAndUpdateColumns = () => {
      let maxColumns = 0;

      gridRefs.current.forEach((gridEl) => {
        if (gridEl) {
          const style = window.getComputedStyle(gridEl);
          const columns = style
            .getPropertyValue("grid-template-columns")
            .split(" ").length;
          if (columns > maxColumns) {
            maxColumns = columns;
          }
        }
      });

      setNumColumns((currentNumColumns) => {
        if (maxColumns !== currentNumColumns) {
          return maxColumns;
        }
        return currentNumColumns;
      });
    };

    calculateAndUpdateColumns();

    const observers = [];
    gridRefs.current.forEach((gridEl) => {
      if (!gridEl) return;
      const observer = new ResizeObserver(calculateAndUpdateColumns);
      observer.observe(gridEl);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [shelves]);

  useEffect(() => {
    setFocusCoords({ shelf: 0, card: 0 });
    prevFocusCoords.current = null;
  }, [currentGames, searchQuery, setFocusCoords, shelves]);

  const handleCardFocus = useCallback((coords) => {
    setFocusCoords((current) => {
      if (current.shelf === coords.shelf && current.card === coords.card) {
        return current;
      }
      return { ...coords, preventScroll: true };
    });
  }, []);

  const handleLaunchGame = useCallback(
    (game) => {
      if (game && !runningGame) {
        launchGame(game);
      }
    },
    [runningGame, launchGame]
  );

  useEffect(() => {
    if (loading || runningGame) return;

    cardRefs.current?.forEach((shelfOfRefs) => {
      if (Array.isArray(shelfOfRefs)) {
        shelfOfRefs.forEach((cardNode) => {
          cardNode?.classList.remove("focused");
        });
      }
    });

    const { shelf, card, preventScroll } = focusCoords;

    const targetNode = cardRefs.current[shelf]?.[card];
    if (targetNode) {
      targetNode.classList.add("focused");
      if (preventScroll) {
        targetNode.focus({ preventScroll: true });
      } else {
        targetNode.focus();
        targetNode.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }

    const prevShelf = prevFocusCoords.current?.shelf;
    if (shelf !== prevShelf) {
      const targetShelfNode = shelfRefs.current[shelf];
      targetShelfNode?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    const currentRow = numColumns > 0 ? Math.floor(card / numColumns) : 0;
    if (shelf === 0 && currentRow === 0) {
      libraryContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }

    prevFocusCoords.current = focusCoords;
  }, [focusCoords, loading, runningGame, shelves.length, numColumns]);

  const focusedGame = useMemo(
    () =>
      !runningGame && shelves.length > 0 && shelves[0]?.games.length > 0
        ? shelves[focusCoords.shelf]?.games[focusCoords.card]
        : null,
    [runningGame, shelves, focusCoords]
  );

  const showSearchModalCb = useCallback(() => {
    showModal((hideThisModal) => (
      <OnScreenKeyboard
        label={t("Search Library")}
        initialValue={searchQuery}
        onConfirm={(query) => {
          setSearchQuery(query);
          hideThisModal();
        }}
        onClose={hideThisModal}
      />
    ));
  }, [setSearchQuery, showModal, searchQuery, t]);

  const clearSearchCb = useCallback(() => {
    setSearchQuery("");
  }, [setSearchQuery]);

  useEffect(() => {
    if (!runningGame && gameCloseCloseModalRef.current) {
      gameCloseCloseModalRef.current();
      gameCloseCloseModalRef.current = null;
    }
  }, [runningGame, gameCloseCloseModalRef]);

  const closeRunningGameDialogCb = useCallback(() => {
    if (!runningGame) {
      return;
    }
    showModal((hideThisModal) => {
      gameCloseCloseModalRef.current = hideThisModal;
      return (
        <ConfirmationDialog
          message={t("Are you sure you want to close\n{{title}}?", {
            title: runningGame.title,
          })}
          description={t(
            "This action will force-quit the game. Any unsaved progress may be lost."
          )}
          onConfirm={() => {
            closeRunningGame();
            hideThisModal();
          }}
          onDeny={hideThisModal}
        />
      );
    });
  }, [closeRunningGame, showModal, runningGame, t]);

  const handleNavigation = useCallback(
    (direction) => {
      setFocusCoords((current) => {
        const { shelf } = current;
        const currentShelfGames = shelves[shelf]?.games;

        if (numColumns === 0 || !currentShelfGames?.length) {
          return current;
        }

        const move = (current, direction, numColumns, shelves) => {
          const { shelf, card } = current;
          const currentShelfGames = shelves[shelf]?.games;

          if (!currentShelfGames?.length) return current;

          const totalRows = Math.ceil(currentShelfGames.length / numColumns);
          const currentRow = Math.floor(card / numColumns);
          const currentCol = card % numColumns;

          switch (direction) {
            case "UP": {
              if (currentRow > 0) {
                return { shelf, card: card - numColumns };
              } else {
                const prevShelfIndex =
                  (shelf - 1 + shelves.length) % shelves.length;
                const prevShelfGames = shelves[prevShelfIndex].games;
                if (!prevShelfGames.length) return current;

                const lastCardInPrevShelf = prevShelfGames.length - 1;
                const lastRowInPrevShelf = Math.floor(
                  lastCardInPrevShelf / numColumns
                );

                return {
                  shelf: prevShelfIndex,
                  card: Math.min(
                    lastRowInPrevShelf * numColumns + currentCol,
                    lastCardInPrevShelf
                  ),
                };
              }
            }
            case "DOWN": {
              if (currentRow < totalRows - 1) {
                return {
                  shelf,
                  card: Math.min(
                    card + numColumns,
                    currentShelfGames.length - 1
                  ),
                };
              } else {
                const nextShelfIndex = (shelf + 1) % shelves.length;
                const nextShelfGames = shelves[nextShelfIndex].games;
                if (!nextShelfGames.length) return current;
                return {
                  shelf: nextShelfIndex,
                  card: Math.min(currentCol, nextShelfGames.length - 1),
                };
              }
            }
            case "LEFT":
            case "RIGHT": {
              const rowStartCard = currentRow * numColumns;
              const rowEndCard = Math.min(
                rowStartCard + numColumns - 1,
                currentShelfGames.length - 1
              );

              const gamesInCurrentRow = rowEndCard - rowStartCard + 1;
              if (gamesInCurrentRow <= 1) {
                return current;
              }

              if (direction === "LEFT") {
                return card === rowStartCard
                  ? { shelf, card: rowEndCard }
                  : { shelf, card: card - 1 };
              } else {
                return card === rowEndCard
                  ? { shelf, card: rowStartCard }
                  : { shelf, card: card + 1 };
              }
            }
            default:
              return current;
          }
        };

        const nextFocus = move(current, direction, numColumns, shelves);

        if (
          nextFocus.shelf !== current.shelf ||
          nextFocus.card !== current.card
        ) {
          playActionSound();
          return nextFocus;
        }

        return current;
      });
    },
    [shelves, numColumns]
  );

  const handlePrevCategory = useCallback(() => {
    setFocusCoords((current) => {
      if (shelves.length <= 1) return current;
      const nextShelf = (current.shelf - 1 + shelves.length) % shelves.length;
      return { shelf: nextShelf, card: 0 };
    });
  }, [shelves]);

  const handleNextCategory = useCallback(() => {
    setFocusCoords((current) => {
      if (shelves.length <= 1) return current;
      const nextShelf = (current.shelf + 1) % shelves.length;
      return { shelf: nextShelf, card: 0 };
    });
  }, [shelves]);

  const libraryInputHandler = useCallback(
    (input) => {
      switch (input.name) {
        case "UP":
        case "DOWN":
        case "LEFT":
        case "RIGHT":
          handleNavigation(input.name);
          break;
        case "A":
          const currentFocusedGame =
            shelves[focusCoords.shelf]?.games[focusCoords.card];
          if (currentFocusedGame) {
            playActionSound();
            handleLaunchGame(currentFocusedGame);
          }
          break;
        case "B":
          if (searchQuery) {
            playActionSound();
            clearSearchCb();
          }
          break;
        case "L1":
          playActionSound();
          handlePrevCategory();
          break;
        case "R1":
          playActionSound();
          handleNextCategory();
          break;
        case "X":
          playActionSound();
          showSearchModalCb();
          break;
      }
    },
    [
      shelves,
      focusCoords,
      searchQuery,
      handleLaunchGame,
      clearSearchCb,
      showSearchModalCb,
      handlePrevCategory,
      handleNextCategory,
      handleNavigation,
    ]
  );

  useScopedInput(
    libraryInputHandler,
    LibraryContainerFocusID,
    !runningGame && !isModalOpen
  );

  const closeGameInputHandler = useCallback(
    (input) => {
      if (input.name === "B") {
        playActionSound();
        closeRunningGameDialogCb();
      }
    },
    [closeRunningGameDialogCb]
  );

  useScopedInput(
    closeGameInputHandler,
    LibraryContainerFocusID,
    !!runningGame && !isModalOpen
  );

  useGlobalShortcut([
    {
      key: "Super",
      action: () => {
        playActionSound();
        toggleWindowShow();
      },
      active: true,
    },
  ]);

  const openSystemMenu = useCallback(() => {
    window.dispatchEvent(new Event("toggle-system-menu"));
  }, []);

  const stableOnLaunchGame = useCallback(() => {
    const { shelf, card } = focusCoordsRef.current;
    const game = shelvesRef.current[shelf]?.games[card];
    if (game) {
      launchGame(game);
    }
  }, [launchGame]);

  if (loading) {
    return <LoadingIndicator message={t("Loading library...")} />;
  }

  const controlsOverlayProps = {
    onOpenSystemMenu: openSystemMenu,
  };

  if (runningGame) {
    controlsOverlayProps.onCloseRunningGame = closeRunningGameDialogCb;
    controlsOverlayProps.runningGameTitle = runningGame.title;
  } else if (!isModalOpen) {
    if (focusedGame) {
      controlsOverlayProps.onLaunchGame = stableOnLaunchGame;
    }
    if (searchQuery) {
      controlsOverlayProps.onClearSearch = clearSearchCb;
    }
    controlsOverlayProps.onShowSearchModal = showSearchModalCb;
  }

  if (runningGame) {
    return (
      <>
        <RunningGame game={runningGame} />
        <ControlsOverlay {...controlsOverlayProps} />
      </>
    );
  }

  return (
    <>
      <GameLibrary
        shelves={shelves}
        onCardFocus={handleCardFocus}
        onCardClick={handleLaunchGame}
        setCardRef={setCardRef}
        setShelfRef={setShelfRef}
        setGridRef={setGridRef}
        libraryContainerRef={libraryContainerRef}
        searchQuery={searchQuery}
      />
      <ControlsOverlay {...controlsOverlayProps} />
    </>
  );
};

export default LibraryContainer;
