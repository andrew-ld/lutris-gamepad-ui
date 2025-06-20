import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLutris } from "../contexts/LutrisContext";
import { useInput } from "../contexts/InputContext";
import GameLibrary from "./GameLibrary";
import LoadingIndicator from "./LoadingIndicator";
import RunningGame from "./RunningGame";
import ControlsOverlay from "./ControlsOverlay";

export const LibraryContainerFocusID = "LibraryContainer";

const LibraryContainer = () => {
  const {
    games,
    loading,
    runningGame,
    fetchGames,
    launchGame,
    closeRunningGame,
  } = useLutris();

  const [focusCoords, setFocusCoords] = useState({ shelf: 0, card: 0 });

  const { lastInput, isFocused } = useInput();
  const cardRefs = useRef([[]]);

  const shelves = useMemo(() => {
    if (!games || games.length === 0) return [];
    const sortedGames = [...games].sort((a, b) => b.lastPlayed - a.lastPlayed);
    const newShelves = [
      { title: "Recently Played", games: sortedGames.slice(0, 10) },
      { title: "All Games", games: games },
    ];
    cardRefs.current = newShelves.map((shelf) => Array(shelf.games.length));
    return newShelves;
  }, [games]);

  useEffect(() => {
    setFocusCoords({ shelf: 0, card: 0 });
  }, [games]);

  const handleCardFocusByMouse = useCallback((coords) => {
    setFocusCoords((current) => {
      if (current.shelf === coords.shelf && current.card === coords.card) {
        return current;
      }
      return { ...coords, preventScroll: true };
    });
  }, []);

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
      return { shelf, card };
    });
  }, [lastInput, loading, isFocused, shelves]);

  useEffect(() => {
    if (!lastInput || loading || !isFocused(LibraryContainerFocusID)) return;
    const { name: action } = lastInput;

    switch (action) {
      case "B":
        if (runningGame) {
          closeRunningGame();
        }
        break;
      case "A":
        fetchGames();
        break;
      case "X":
        if (!runningGame) {
          const gameToLaunch =
            shelves[focusCoords.shelf]?.games[focusCoords.card];
          if (gameToLaunch) {
            launchGame(gameToLaunch);
          }
        }
        break;
    }
  }, [
    lastInput,
    loading,
    isFocused,
    runningGame,
    focusCoords,
    shelves,
    fetchGames,
    launchGame,
    closeRunningGame,
  ]);

  const focusedGame =
    !runningGame && shelves.length > 0
      ? shelves[focusCoords.shelf]?.games[focusCoords.card]
      : null;

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
        onCardFocus={handleCardFocusByMouse}
        cardRefs={cardRefs}
      />
      <ControlsOverlay focusedGame={focusedGame} runningGame={null} />
    </>
  );
};

export default LibraryContainer;
