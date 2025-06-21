import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLutris } from "../contexts/LutrisContext";
import { useInput } from "../contexts/InputContext";
import { useModal } from "../contexts/ModalContext";
import GameLibrary from "./GameLibrary";
import LoadingIndicator from "./LoadingIndicator";
import RunningGame from "./RunningGame";
import ControlsOverlay from "./ControlsOverlay";
import OnScreenKeyboard from "./OnScreenKeyboard";
import { playActionSound } from "../utils/sound";
import { togleWindowShow } from "../utils/ipc";

export const LibraryContainerFocusID = "LibraryContainer";

const LibraryContainer = () => {
  const { games, loading, runningGame, launchGame, closeRunningGame } =
    useLutris();

  const [focusCoords, setFocusCoords] = useState({ shelf: 0, card: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const { lastInput, isFocused } = useInput();
  const { showModal } = useModal();
  const cardRefs = useRef([[]]);

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
    if (loading || runningGame || !isFocused(LibraryContainerFocusID)) return;
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
  }, [focusCoords, loading, runningGame, isFocused]);

  useEffect(() => {
    if (!lastInput || loading || !isFocused(LibraryContainerFocusID)) return;

    const { name: direction } = lastInput;
    if (!["UP", "DOWN", "LEFT", "RIGHT"].includes(direction)) return;

    setFocusCoords((current) => {
      let { shelf, card } = current;
      if (shelves.length === 0 || shelves[shelf]?.games.length === 0)
        return current;

      const originalCoords = { shelf, card };

      switch (direction) {
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

      if (originalCoords.shelf !== shelf || originalCoords.card !== card) {
        playActionSound();
      }

      return { shelf, card };
    });
  }, [lastInput, loading, isFocused, shelves]);

  const focusedGame =
    !runningGame && shelves.length > 0 && shelves[0]?.games.length > 0
      ? shelves[focusCoords.shelf]?.games[focusCoords.card]
      : null;

  useEffect(() => {
    if (
      !runningGame ||
      lastInput?.name !== "Super" ||
      !isFocused(LibraryContainerFocusID)
    ) {
      return;
    }

    togleWindowShow();
  }, [runningGame, lastInput, isFocused]);

  useEffect(() => {
    if (!lastInput || loading || !isFocused(LibraryContainerFocusID)) return;
    const { name: action } = lastInput;

    switch (action) {
      case "B":
        playActionSound();

        if (runningGame) {
          closeRunningGame();
        } else if (searchQuery) {
          setSearchQuery("");
        }
        break;
      case "A":
        if (!runningGame && focusedGame) {
          playActionSound();
          handleLaunchGame(focusedGame);
        }
        break;
      case "X":
        if (!runningGame) {
          playActionSound();
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
        }
        break;
    }
  }, [
    lastInput,
    loading,
    isFocused,
    runningGame,
    focusedGame,
    handleLaunchGame,
    closeRunningGame,
    searchQuery,
    showModal,
  ]);

  if (loading) {
    return <LoadingIndicator message="Loading library..." />;
  }

  if (runningGame) {
    return (
      <>
        <RunningGame game={runningGame} />
        <ControlsOverlay focusedGame={null} runningGame={runningGame} />
      </>
    );
  }

  return (
    <>
      <GameLibrary
        shelves={shelves}
        focusCoords={focusCoords}
        onCardFocus={handleCardFocus}
        onCardClick={handleLaunchGame}
        setCardRef={setCardRef}
        searchQuery={searchQuery}
      />
      <ControlsOverlay
        focusedGame={focusedGame}
        runningGame={null}
        hasSearch={!!searchQuery}
      />
    </>
  );
};

export default LibraryContainer;
