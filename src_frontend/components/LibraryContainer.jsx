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
  const gameCloseCloseModalRef = useRef(null);

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
    if (!runningGame && gameCloseCloseModalRef.current) {
      gameCloseCloseModalRef.current();
      gameCloseCloseModalRef.current = null;
    }
  }, [runningGame]);

  const [focusedGame, setFocusedGame] = useState(null);

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

  const showGameSettingsModalCb = useCallback(
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

  const clearSearchCb = useCallback(() => {
    setSearchQuery("");
  }, [setSearchQuery]);

  const toggleGamePauseCb = useCallback(() => {
    if (!runningGame) return;

    if (gameCloseCloseModalRef.current) {
      gameCloseCloseModalRef.current();
      gameCloseCloseModalRef.current = null;
    }

    if (!isGamePaused) {
      showModal((hideThisModal) => {
        gameCloseCloseModalRef.current = hideThisModal;
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
    } else {
      toggleGamePause();
    }
  }, [runningGame, isGamePaused, t, showModal]);

  const closeRunningGameDialogCb = useCallback(() => {
    if (!runningGame) return;

    if (gameCloseCloseModalRef.current) {
      gameCloseCloseModalRef.current();
    }

    showModal((hideThisModal) => {
      gameCloseCloseModalRef.current = hideThisModal;
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
        case "A":
          if (game) {
            playActionSound();
            launchGame(game);
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
        case "Start":
          playActionSound();
          showGameSettingsModalCb(game);
          break;
      }
    },
    [
      searchQuery,
      launchGame,
      clearSearchCb,
      showSearchModalCb,
      showGameSettingsModalCb,
      playActionSound,
    ],
  );

  const handleRunningGameAction = useCallback(
    (input) => {
      if (input.name === "B") {
        playActionSound();
        closeRunningGameDialogCb();
      }
      if (input.name === "X") {
        playActionSound();
        toggleGamePauseCb();
      }
    },
    [closeRunningGameDialogCb, toggleGamePauseCb, playActionSound],
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
    window.dispatchEvent(new Event("toggle-system-menu"));
  }, []);

  if (loading) {
    return <LoadingIndicator message={t("Loading library...")} />;
  }

  const controlsOverlayProps = {
    onOpenSystemMenu: openSystemMenu,
  };

  if (runningGame) {
    controlsOverlayProps.onCloseRunningGame = closeRunningGameDialogCb;
    controlsOverlayProps.onToggleGamePause = toggleGamePauseCb;
    controlsOverlayProps.isGamePaused = isGamePaused;

    return (
      <ControlsOverlay {...controlsOverlayProps}>
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
      controlsOverlayProps.onPrevCategory = true;
      controlsOverlayProps.onNextCategory = true;
    }
    if (focusedGame) {
      controlsOverlayProps.onLaunchGame = () => launchGame(focusedGame);
      controlsOverlayProps.onShowGameSettings = () =>
        showGameSettingsModalCb(focusedGame);
    }
    if (searchQuery) {
      controlsOverlayProps.onClearSearch = clearSearchCb;
    }
    controlsOverlayProps.onShowSearchModal = showSearchModalCb;
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
    <ControlsOverlay {...controlsOverlayProps}>
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
