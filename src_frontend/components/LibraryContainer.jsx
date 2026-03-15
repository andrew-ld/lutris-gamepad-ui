import { useState, useCallback, useMemo, useRef, useEffect } from "react";

import { useLutris } from "../contexts/LutrisContext";
import { useModalActions, useModalState } from "../contexts/ModalContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useGameShelves } from "../hooks/useGameShelves";
import { useGlobalShortcut } from "../hooks/useGlobalShortcut";
import { usePlayButtonActionSound } from "../hooks/usePlayButtonActionSound";
import { useScopedInput } from "../hooks/useScopedInput";
import { toggleWindowShow, toggleGamePause } from "../utils/ipc";

import ConfirmationDialog from "./ConfirmationDialog";
import ControlsOverlay from "./ControlsOverlay";
import GameCard from "./GameCard";
import GridMenu from "./GridMenu";
import LoadingIndicator from "./LoadingIndicator";
import LutrisSettingsMenu from "./LutrisSettingsMenu";
import OnScreenKeyboard from "./OnScreenKeyboard";
import RunningGame from "./RunningGame";

export const LibraryContainerFocusID = "LibraryContainer";

const LibraryContainer = () => {
  const { t } = useTranslation();
  const {
    games,
    loading,
    runningGame,
    isGamePaused,
    launchGame,
    closeRunningGame,
  } = useLutris();
  const { showModal } = useModalActions();
  const { isModalOpen } = useModalState();
  const playActionSound = usePlayButtonActionSound();

  const [searchQuery, setSearchQuery] = useState("");
  const gameCloseModalReference = useRef(null);

  const { shelves } = useGameShelves(games, searchQuery);

  const sections = useMemo(
    () =>
      shelves.map((shelf) => ({
        title: shelf.title,
        items: shelf.games,
      })),
    [shelves],
  );

  useEffect(() => {
    if (!runningGame && gameCloseModalReference.current) {
      gameCloseModalReference.current();
      gameCloseModalReference.current = null;
    }
  }, [runningGame]);

  const [focusedGame, setFocusedGame] = useState(null);

  const showSearchModalCallback = useCallback(() => {
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

  const showGameSettingsModalCallback = useCallback(
    (game) => {
      if (game) {
        showModal((hideThisModal) => (
          <LutrisSettingsMenu
            gameSlug={game.slug}
            runnerSlug={game.runner}
            onClose={hideThisModal}
          />
        ));
      }
    },
    [showModal],
  );

  const clearSearchCallback = useCallback(() => {
    setSearchQuery("");
  }, [setSearchQuery]);

  const toggleGamePauseCallback = useCallback(() => {
    if (!runningGame) return;

    if (gameCloseModalReference.current) {
      gameCloseModalReference.current();
      gameCloseModalReference.current = null;
    }

    if (isGamePaused) {
      toggleGamePause();
    } else {
      showModal((hideThisModal) => {
        gameCloseModalReference.current = hideThisModal;
        return (
          <ConfirmationDialog
            message={t("Are you sure you want to pause\n{{title}}?", {
              title: runningGame.title,
            })}
            description={t(
              "This feature is experimental. Pausing the game may cause issues.",
            )}
            onConfirm={() => {
              toggleGamePause();
              hideThisModal();
            }}
            onDeny={hideThisModal}
          />
        );
      });
    }
  }, [runningGame, isGamePaused, t, showModal]);

  const closeRunningGameDialogCallback = useCallback(() => {
    if (!runningGame) return;

    if (gameCloseModalReference.current) {
      gameCloseModalReference.current();
    }

    showModal((hideThisModal) => {
      gameCloseModalReference.current = hideThisModal;
      return (
        <ConfirmationDialog
          message={t("Are you sure you want to close\n{{title}}?", {
            title: runningGame.title,
          })}
          description={t(
            "This action will force-quit the game. Any unsaved progress may be lost.",
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

  const handleAction = useCallback(
    (actionName, game) => {
      switch (actionName) {
        case "A": {
          if (game) {
            playActionSound();
            launchGame(game);
          }
          break;
        }
        case "B": {
          if (searchQuery) {
            playActionSound();
            clearSearchCallback();
          }
          break;
        }
        case "X": {
          playActionSound();
          showSearchModalCallback();
          break;
        }
        case "Start": {
          playActionSound();
          showGameSettingsModalCallback(game);
          break;
        }
      }
    },
    [
      searchQuery,
      launchGame,
      clearSearchCallback,
      showSearchModalCallback,
      showGameSettingsModalCallback,
      playActionSound,
    ],
  );

  const handleRunningGameAction = useCallback(
    (input) => {
      if (input.name === "B") {
        playActionSound();
        closeRunningGameDialogCallback();
      }
      if (input.name === "X") {
        playActionSound();
        toggleGamePauseCallback();
      }
    },
    [closeRunningGameDialogCallback, toggleGamePauseCallback, playActionSound],
  );

  useScopedInput(
    handleRunningGameAction,
    LibraryContainerFocusID,
    !!runningGame && !isModalOpen,
  );

  useGlobalShortcut([
    {
      key: "Super",
      active: true,
      action: useCallback(() => {
        playActionSound();
        toggleWindowShow();
      }, [playActionSound]),
    },
  ]);

  const openSystemMenu = useCallback(() => {
    globalThis.dispatchEvent(new Event("toggle-system-menu"));
  }, []);

  if (loading) {
    return <LoadingIndicator message={t("Loading library...")} />;
  }

  const controlsOverlayProperties = {
    onOpenSystemMenu: openSystemMenu,
  };

  if (runningGame) {
    controlsOverlayProperties.onCloseRunningGame =
      closeRunningGameDialogCallback;
    controlsOverlayProperties.onToggleGamePause = toggleGamePauseCallback;
    controlsOverlayProperties.isGamePaused = isGamePaused;

    return (
      <ControlsOverlay {...controlsOverlayProperties}>
        <RunningGame
          game={runningGame}
          isPaused={isGamePaused}
          onAction={handleRunningGameAction}
        />
      </ControlsOverlay>
    );
  }

  if (!isModalOpen) {
    if (sections.length > 1) {
      controlsOverlayProperties.onPrevCategory = true;
      controlsOverlayProperties.onNextCategory = true;
    }
    if (focusedGame) {
      controlsOverlayProperties.onLaunchGame = () => launchGame(focusedGame);
      controlsOverlayProperties.onShowGameSettings = () =>
        showGameSettingsModalCallback(focusedGame);
    }
    if (searchQuery) {
      controlsOverlayProperties.onClearSearch = clearSearchCallback;
    }
    controlsOverlayProperties.onShowSearchModal = showSearchModalCallback;
  }

  const renderItem = (game, { _isFocused }, { onFocus, onClick, ref }) => (
    <GameCard
      key={game.id}
      ref={ref}
      game={game}
      onFocus={onFocus}
      onClick={onClick}
    />
  );

  const renderHeader = () => (
    <header className="library-header">
      <h1>{searchQuery ? t("Search") : t("My Library")}</h1>
    </header>
  );

  const renderEmpty = () => (
    <div className="empty-library-message">
      <h2>
        {searchQuery
          ? t('No results for "{{searchQuery}}"', { searchQuery })
          : t("No games found")}
      </h2>
      <p>
        {searchQuery
          ? t("Try a different search term or press 'B' to clear.")
          : t("Add games in Lutris and reload.")}
      </p>
    </div>
  );

  return (
    <ControlsOverlay {...controlsOverlayProperties}>
      <GridMenu
        sections={sections}
        renderItem={renderItem}
        renderHeader={renderHeader}
        renderEmpty={renderEmpty}
        onAction={handleAction}
        onFocusChange={setFocusedGame}
        focusId={LibraryContainerFocusID}
        isActive={!runningGame && !isModalOpen}
      />
    </ControlsOverlay>
  );
};

export default LibraryContainer;
