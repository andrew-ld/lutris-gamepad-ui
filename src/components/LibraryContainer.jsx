import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLutris } from "../contexts/LutrisContext";
import { useModal } from "../contexts/ModalContext";
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

export const LibraryContainerFocusID = "LibraryContainer";

const LibraryContainer = () => {
  const { games, loading, runningGame, launchGame, closeRunningGame } =
    useLutris();

  const [focusCoords, setFocusCoords] = useState({ shelf: 0, card: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const { showModal, isModalOpen } = useModal();
  const cardRefs = useRef([[]]);
  const gameCloseCloseModalRef = useRef(null);

  const setCardRef = useCallback((el, shelfIndex, cardIndex) => {
    if (!cardRefs.current[shelfIndex]) {
      cardRefs.current[shelfIndex] = [];
    }
    cardRefs.current[shelfIndex][cardIndex] = el;
  }, []);

  const shelves = useMemo(() => {
    if (!games || games.length === 0) return [];

    let filteredGames = games;
    if (searchQuery) {
      filteredGames = games.filter((g) =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const sortedGames = [...filteredGames].sort(
      (a, b) => b.lastPlayed - a.lastPlayed
    );
    const newShelves = [
      { title: "Recently Played", games: sortedGames.slice(0, 10) },
      { title: "All Games", games: filteredGames },
    ];

    if (searchQuery) {
      return [
        {
          title: `Results for "${searchQuery}"`,
          games: filteredGames.sort((a, b) => a.title.localeCompare(b.title)),
        },
      ];
    }

    cardRefs.current = newShelves.map((shelf) => Array(shelf.games.length));
    return newShelves;
  }, [games, searchQuery]);

  useEffect(() => {
    setFocusCoords({ shelf: 0, card: 0 });
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
    const { shelf, card, preventScroll } = focusCoords;
    const targetNode = cardRefs.current[shelf]?.[card];
    if (targetNode) {
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
  }, [focusCoords, loading, runningGame]);

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
        label="Search Library"
        initialValue={searchQuery}
        onConfirm={(query) => {
          setSearchQuery(query);
          hideThisModal();
        }}
        onClose={hideThisModal}
      />
    ));
  }, [setSearchQuery, showModal, searchQuery]);

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
          message={`Are you sure you want to close\n${runningGame.title}?`}
          onConfirm={() => {
            closeRunningGame();
            hideThisModal();
          }}
          onDeny={hideThisModal}
        />
      );
    });
  }, [closeRunningGame, showModal, runningGame]);

  const libraryInputHandler = useCallback(
    (input) => {
      switch (input.name) {
        case "UP":
        case "DOWN":
        case "LEFT":
        case "RIGHT":
          setFocusCoords((current) => {
            let { shelf, card } = current;
            if (shelves.length === 0 || shelves[shelf]?.games.length === 0)
              return current;

            const originalCoords = { shelf, card };

            switch (input.name) {
              case "UP":
                shelf = Math.max(0, shelf - 1);
                break;
              case "DOWN":
                shelf = Math.min(shelves.length - 1, shelf + 1);
                break;
              case "LEFT":
                card = Math.max(0, card - 1);
                break;
              case "RIGHT":
                card = Math.min(shelves[shelf].games.length - 1, card + 1);
                break;
              default:
                return current;
            }
            card = Math.min(card, shelves[shelf]?.games.length - 1 || 0);

            if (
              originalCoords.shelf !== shelf ||
              originalCoords.card !== card
            ) {
              playActionSound();
            }

            return { shelf, card };
          });
          break;
        case "A":
          if (focusedGame) {
            playActionSound();
            handleLaunchGame(focusedGame);
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
      focusedGame,
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

  if (loading) {
    return <LoadingIndicator message="Loading library..." />;
  }

  const controlsOverlayProps = {
    onOpenSystemMenu: openSystemMenu,
  };

  if (runningGame) {
    controlsOverlayProps.onCloseRunningGame = closeRunningGameDialogCb;
    controlsOverlayProps.runningGameTitle = runningGame.title;
  } else if (!isModalOpen) {
    if (focusedGame) {
      controlsOverlayProps.onLaunchGame = () => handleLaunchGame(focusedGame);
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
        focusCoords={focusCoords}
        onCardFocus={handleCardFocus}
        onCardClick={(game) => {
          handleLaunchGame(game);
        }}
        setCardRef={setCardRef}
        searchQuery={searchQuery}
      />
      <ControlsOverlay {...controlsOverlayProps} />
    </>
  );
};

export default LibraryContainer;
