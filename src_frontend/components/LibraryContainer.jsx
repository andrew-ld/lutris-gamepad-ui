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

export const LibraryContainerFocusID = "LibraryContainer";

const LibraryContainer = () => {
  const { t } = useTranslation();
  const { games, loading, runningGame, launchGame, closeRunningGame } =
    useLutris();

  const [focusCoords, setFocusCoords] = useState({ shelf: 0, card: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const { showModal } = useModalActions();
  const { isModalOpen } = useModalState();

  const libraryContainerRef = useRef(null);
  const cardRefs = useRef([[]]);
  const shelfRefs = useRef([]);
  const gameCloseCloseModalRef = useRef(null);
  const prevFocusCoords = useRef(null);

  const setShelfRef = useCallback((el, shelfIndex) => {
    shelfRefs.current[shelfIndex] = el;
  }, []);

  const setCardRef = useCallback((el, shelfIndex, cardIndex) => {
    if (!cardRefs.current[shelfIndex]) {
      cardRefs.current[shelfIndex] = [];
    }
    cardRefs.current[shelfIndex][cardIndex] = el;
  }, []);

  const shelves = useMemo(() => {
    if (!games || games.length === 0) return [];

    if (searchQuery) {
      const filteredGames = games.filter((g) =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const searchShelves = [
        {
          title: t('Results for "{{searchQuery}}"', { searchQuery }),
          games: filteredGames.sort((a, b) => a.title.localeCompare(b.title)),
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

    const recentlyPlayedGames = sortByLastPlayed(games).slice(0, 10);
    if (recentlyPlayedGames.length > 0) {
      newShelves.push({ title: "Recently Played", games: recentlyPlayedGames });
    }

    const allGamesSorted = [...games].sort((a, b) =>
      a.title.localeCompare(b.title)
    );
    newShelves.push({ title: "All Games", games: allGamesSorted });

    const categoriesMap = new Map();
    games.forEach((game) => {
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
  }, [games, searchQuery, t]);

  const shelvesRef = useRef(shelves);
  shelvesRef.current = shelves;
  const focusCoordsRef = useRef(focusCoords);
  focusCoordsRef.current = focusCoords;

  useEffect(() => {
    setFocusCoords({ shelf: 0, card: 0 });
    prevFocusCoords.current = null;
  }, [games, searchQuery]);

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

    if (prevFocusCoords.current) {
      const { shelf: prevShelf, card: prevCard } = prevFocusCoords.current;
      const prevNode = cardRefs.current[prevShelf]?.[prevCard];
      if (prevNode) {
        prevNode.classList.remove("focused");
      }
    }

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
      if (shelf === 0) {
        libraryContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const targetShelfNode = shelfRefs.current[shelf];
        targetShelfNode?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }

    prevFocusCoords.current = focusCoords;
  }, [focusCoords, loading, runningGame, shelves.length]);

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

  const libraryInputHandler = useCallback(
    (input) => {
      let currentFocusedGame;
      switch (input.name) {
        case "UP":
        case "DOWN":
        case "LEFT":
        case "RIGHT":
          setFocusCoords((current) => {
            const { shelf: currentShelf, card: currentCard } = current;
            if (
              shelves.length === 0 ||
              shelves[currentShelf]?.games.length === 0
            )
              return current;

            let nextShelf = currentShelf;
            let nextCard = currentCard;

            switch (input.name) {
              case "UP":
                nextShelf = Math.max(0, currentShelf - 1);
                break;
              case "DOWN":
                nextShelf = Math.min(shelves.length - 1, currentShelf + 1);
                break;
              case "LEFT":
                nextCard = Math.max(0, currentCard - 1);
                break;
              case "RIGHT":
                nextCard = Math.min(
                  shelves[currentShelf].games.length - 1,
                  currentCard + 1
                );
                break;
              default:
                return current;
            }

            if (nextShelf !== currentShelf) {
              nextCard = Math.min(
                nextCard,
                shelves[nextShelf].games.length - 1
              );
            }

            if (currentShelf !== nextShelf || currentCard !== nextCard) {
              playActionSound();
            }

            return { shelf: nextShelf, card: nextCard };
          });
          break;
        case "A":
          currentFocusedGame =
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
      active: !!runningGame,
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
        libraryContainerRef={libraryContainerRef}
        searchQuery={searchQuery}
      />
      <ControlsOverlay {...controlsOverlayProps} />
    </>
  );
};

export default LibraryContainer;
