import { useCallback, useMemo, useState } from "react";

import RowBasedMenu from "../navigation/row_based_menu/RowBasedMenu";
import { useSettingsActions, useSettingsState } from "../stores/settingsStore";
import { useTranslation } from "../stores/translationStore";

import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import PercentageBar from "./PercentageBar";
import ToggleButton from "./ToggleButton";

import "../styles/SettingsMenu.css";

export const SettingsMenuFocusId = "SettingsMenu";

const MIN_ZOOM = 0.5; // 50%
const MAX_ZOOM = 2; // 200%
const ZOOM_STEP = 0.05; // 5%

const MIN_AUTOREPEAT = 100; // 100ms
const MAX_AUTOREPEAT = 500; // 500ms
const AUTOREPEAT_STEP = 25; // 25ms

const LIBRARY_SORT_MODE_OPTIONS = [
  "gameName",
  "runnerName",
  "lastPlayed",
  "runnerLastPlayed",
];

const SUSPEND_MODE_OPTIONS = [
  "none",
  "sleep",
  "hybrid-sleep",
  "suspend-then-hibernate",
  "hibernate",
];

const getLibrarySortModeIndex = (sortMode) => {
  const index = LIBRARY_SORT_MODE_OPTIONS.indexOf(sortMode);

  return index === -1 ? 0 : index;
};

const getSuspendModeIndex = (suspendMode) => {
  const index = SUSPEND_MODE_OPTIONS.indexOf(suspendMode);

  return index === -1 ? 0 : index;
};

const SettingsMenu = ({ onClose }) => {
  const { t } = useTranslation();
  const [focusedItem, setFocusedItem] = useState(null);

  const { settings } = useSettingsState();
  const { updateSetting } = useSettingsActions();

  const handleZoomChange = useCallback(
    (newFactor) => {
      const clampedFactor = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newFactor));
      const roundedFactor = Math.round(clampedFactor * 100) / 100;
      updateSetting("zoomFactor", roundedFactor);
    },
    [updateSetting],
  );

  const decreaseZoom = useCallback(() => {
    handleZoomChange(settings.zoomFactor - ZOOM_STEP);
  }, [settings, handleZoomChange]);

  const increaseZoom = useCallback(() => {
    handleZoomChange(settings.zoomFactor + ZOOM_STEP);
  }, [settings, handleZoomChange]);

  const handleAutorepeatChange = useCallback(
    (newValue) => {
      const clampedValue = Math.max(
        MIN_AUTOREPEAT,
        Math.min(MAX_AUTOREPEAT, newValue),
      );
      updateSetting("gamepadAutorepeatMs", clampedValue);
    },
    [updateSetting],
  );

  const decreaseAutorepeat = useCallback(() => {
    handleAutorepeatChange(settings.gamepadAutorepeatMs - AUTOREPEAT_STEP);
  }, [settings, handleAutorepeatChange]);

  const increaseAutorepeat = useCallback(() => {
    handleAutorepeatChange(settings.gamepadAutorepeatMs + AUTOREPEAT_STEP);
  }, [settings, handleAutorepeatChange]);

  const updateSuspendMode = useCallback(
    (offset) => {
      const currentIndex = getSuspendModeIndex(settings.systemPowerSuspendMode);
      const nextIndex =
        (currentIndex + offset + SUSPEND_MODE_OPTIONS.length) %
        SUSPEND_MODE_OPTIONS.length;

      updateSetting("systemPowerSuspendMode", SUSPEND_MODE_OPTIONS[nextIndex]);
    },
    [settings.systemPowerSuspendMode, updateSetting],
  );

  const previousSuspendMode = useCallback(() => {
    updateSuspendMode(-1);
  }, [updateSuspendMode]);

  const nextSuspendMode = useCallback(() => {
    updateSuspendMode(1);
  }, [updateSuspendMode]);

  const suspendModeLabel = useMemo(() => {
    switch (settings.systemPowerSuspendMode) {
      case "none": {
        return t("None");
      }
      case "sleep": {
        return t("Sleep");
      }
      case "hybrid-sleep": {
        return t("Hybrid sleep");
      }
      case "suspend-then-hibernate": {
        return t("Suspend then hibernate");
      }
      case "hibernate": {
        return t("Hibernate");
      }
      default: {
        return t("Unknown");
      }
    }
  }, [settings.systemPowerSuspendMode, t]);

  const updateLibrarySortMode = useCallback(
    (offset) => {
      const currentIndex = getLibrarySortModeIndex(settings.librarySortMode);
      const nextIndex =
        (currentIndex + offset + LIBRARY_SORT_MODE_OPTIONS.length) %
        LIBRARY_SORT_MODE_OPTIONS.length;

      updateSetting("librarySortMode", LIBRARY_SORT_MODE_OPTIONS[nextIndex]);
    },
    [settings.librarySortMode, updateSetting],
  );

  const previousLibrarySortMode = useCallback(() => {
    updateLibrarySortMode(-1);
  }, [updateLibrarySortMode]);

  const nextLibrarySortMode = useCallback(() => {
    updateLibrarySortMode(1);
  }, [updateLibrarySortMode]);

  const librarySortModeLabel = useMemo(() => {
    switch (settings.librarySortMode) {
      case "lastPlayed": {
        return t("Game Last Start Date");
      }
      case "runnerLastPlayed": {
        return t("Runner Name + Game Last Start Date");
      }
      case "runnerName": {
        return t("Runner Name + Game Name");
      }
      default: {
        return t("Game Name");
      }
    }
  }, [settings.librarySortMode, t]);

  const toggleShowRecentlyPlayed = useCallback(() => {
    updateSetting("showRecentlyPlayed", !settings.showRecentlyPlayed);
  }, [settings, updateSetting]);

  const toggleShowHiddenGames = useCallback(() => {
    updateSetting("showHiddenGames", !settings.showHiddenGames);
  }, [settings, updateSetting]);

  const toggleShowRunnerIcon = useCallback(() => {
    updateSetting("showRunnerIcon", !settings.showRunnerIcon);
  }, [settings, updateSetting]);

  const toggleUseSdlInput = useCallback(() => {
    updateSetting("enableSdlInput", !settings.enableSdlInput);
  }, [settings, updateSetting]);

  const toggleDoubleConfirmPowerManagement = useCallback(() => {
    updateSetting(
      "doubleConfirmPowerManagement",
      !settings.doubleConfirmPowerManagement,
    );
  }, [settings, updateSetting]);

  const toggleUseRemoteDesktopPortal = useCallback(() => {
    updateSetting("useRemoteDesktopPortal", !settings.useRemoteDesktopPortal);
  }, [settings, updateSetting]);

  const toggleKeepGamesRunningOnQuit = useCallback(() => {
    updateSetting("keepGamesRunningOnQuit", !settings.keepGamesRunningOnQuit);
  }, [settings, updateSetting]);

  const toggleEnableUiActionSoundFeedbacks = useCallback(() => {
    updateSetting(
      "enableUiActionSoundFeedbacks",
      !settings.enableUiActionSoundFeedbacks,
    );
  }, [settings, updateSetting]);

  const menuSections = useMemo(() => {
    const generalItems = [];
    if (settings.zoomFactor !== undefined) {
      generalItems.push({ type: "ZOOM", label: t("Zoom Level") });
    }
    if (settings.useRemoteDesktopPortal !== undefined) {
      generalItems.push({
        type: "USE_REMOTE_DESKTOP_PORTAL",
        label: t("Use Remote Desktop Portal"),
      });
    }
    if (settings.keepGamesRunningOnQuit !== undefined) {
      generalItems.push({
        type: "KEEP_GAMES_RUNNING",
        label: t("Keep Games Running On Quit"),
      });
    }

    const libraryItems = [];
    if (settings.librarySortMode !== undefined) {
      libraryItems.push({
        type: "LIBRARY_SORT_MODE",
        label: t("Library Sort Order"),
      });
    }
    if (settings.showRecentlyPlayed !== undefined) {
      libraryItems.push({
        type: "RECENTLY_PLAYED",
        label: t("Recently Played Shelf"),
      });
    }
    if (settings.showHiddenGames !== undefined) {
      libraryItems.push({
        type: "SHOW_HIDDEN",
        label: t("Show Hidden Games"),
      });
    }
    if (settings.showRunnerIcon !== undefined) {
      libraryItems.push({
        type: "SHOW_RUNNER_ICON",
        label: t("Show Runner Icon"),
      });
    }

    const inputPowerItems = [];
    if (settings.gamepadAutorepeatMs !== undefined) {
      inputPowerItems.push({
        type: "GAMEPAD_AUTOREPEAT",
        label: t("Gamepad Autorepeat Delay"),
      });
    }
    if (settings.enableSdlInput !== undefined) {
      inputPowerItems.push({
        type: "SDL_INPUT",
        label: t("Gamepad SDL Input"),
      });
    }
    if (settings.doubleConfirmPowerManagement !== undefined) {
      inputPowerItems.push({
        type: "DOUBLE_CONFIRM_POWER_MANAGEMENT",
        label: t("Double Confirm Power Management"),
      });
    }
    if (settings.enableUiActionSoundFeedbacks !== undefined) {
      inputPowerItems.push({
        type: "ENABLE_UI_ACTION_SOUND_FEEDBACKS",
        label: t("UI Action Sound Feedbacks"),
      });
    }
    if (settings.systemPowerSuspendMode !== undefined) {
      inputPowerItems.push({
        type: "SYSTEM_POWER_SUSPEND_MODE",
        label: t("System Power Suspend Mode"),
      });
    }

    return [
      { id: "general", label: t("General"), items: generalItems },
      { id: "library", label: t("Library"), items: libraryItems },
      { id: "input_power", label: t("Input & Power"), items: inputPowerItems },
    ].filter((section) => section.items.length > 0);
  }, [t, settings]);

  const handleAction = useCallback(
    (actionName, item) => {
      if (!item) return;

      if (actionName === "B") {
        onClose();
        return;
      }

      switch (item.type) {
        case "SYSTEM_POWER_SUSPEND_MODE": {
          if (actionName === "LEFT") previousSuspendMode();
          else if (actionName === "RIGHT") nextSuspendMode();
          break;
        }
        case "ENABLE_UI_ACTION_SOUND_FEEDBACKS": {
          if (actionName === "A") toggleEnableUiActionSoundFeedbacks();
          break;
        }
        case "KEEP_GAMES_RUNNING": {
          if (actionName === "A") toggleKeepGamesRunningOnQuit();
          break;
        }
        case "USE_REMOTE_DESKTOP_PORTAL": {
          if (actionName === "A") toggleUseRemoteDesktopPortal();
          break;
        }
        case "DOUBLE_CONFIRM_POWER_MANAGEMENT": {
          if (actionName === "A") toggleDoubleConfirmPowerManagement();
          break;
        }
        case "SDL_INPUT": {
          if (actionName === "A") toggleUseSdlInput();
          break;
        }
        case "RECENTLY_PLAYED": {
          if (actionName === "A") toggleShowRecentlyPlayed();
          break;
        }
        case "SHOW_HIDDEN": {
          if (actionName === "A") toggleShowHiddenGames();
          break;
        }
        case "SHOW_RUNNER_ICON": {
          if (actionName === "A") toggleShowRunnerIcon();
          break;
        }
        case "LIBRARY_SORT_MODE": {
          if (actionName === "LEFT") previousLibrarySortMode();
          else if (actionName === "RIGHT" || actionName === "A")
            nextLibrarySortMode();
          break;
        }
        case "ZOOM": {
          if (actionName === "LEFT") decreaseZoom();
          else if (actionName === "RIGHT") increaseZoom();
          break;
        }
        case "GAMEPAD_AUTOREPEAT": {
          if (actionName === "LEFT") decreaseAutorepeat();
          else if (actionName === "RIGHT") increaseAutorepeat();
          break;
        }
      }
    },
    [
      onClose,
      previousSuspendMode,
      nextSuspendMode,
      toggleEnableUiActionSoundFeedbacks,
      toggleKeepGamesRunningOnQuit,
      toggleUseRemoteDesktopPortal,
      toggleDoubleConfirmPowerManagement,
      toggleUseSdlInput,
      toggleShowRecentlyPlayed,
      toggleShowHiddenGames,
      toggleShowRunnerIcon,
      previousLibrarySortMode,
      nextLibrarySortMode,
      decreaseZoom,
      increaseZoom,
      decreaseAutorepeat,
      increaseAutorepeat,
    ],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter, ref) => {
      switch (item.type) {
        case "ZOOM": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
            >
              <span className="settings-menu-label">{item.label}</span>
              <PercentageBar
                percent={
                  ((settings.zoomFactor - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) *
                  100
                }
                label={`${Math.round(settings.zoomFactor * 100)}%`}
              />
            </FocusableRow>
          );
        }
        case "GAMEPAD_AUTOREPEAT": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
            >
              <span className="settings-menu-label">{item.label}</span>
              <PercentageBar
                percent={
                  ((settings.gamepadAutorepeatMs - MIN_AUTOREPEAT) /
                    (MAX_AUTOREPEAT - MIN_AUTOREPEAT)) *
                  100
                }
                label={`${settings.gamepadAutorepeatMs}ms`}
              />
            </FocusableRow>
          );
        }
        case "SYSTEM_POWER_SUSPEND_MODE": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={nextSuspendMode}
            >
              <span className="settings-menu-label">{item.label}</span>
              <div className="settings-menu-value">{suspendModeLabel}</div>
            </FocusableRow>
          );
        }
        case "LIBRARY_SORT_MODE": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={nextLibrarySortMode}
            >
              <span className="settings-menu-label">{item.label}</span>
              <div className="settings-menu-value">{librarySortModeLabel}</div>
            </FocusableRow>
          );
        }
        case "RECENTLY_PLAYED": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={toggleShowRecentlyPlayed}
            >
              <span className="settings-menu-label">{item.label}</span>
              <ToggleButton
                isToggledOn={settings.showRecentlyPlayed}
                labelOn={t("Disable")}
                labelOff={t("Enable")}
                onClick={toggleShowRecentlyPlayed}
              />
            </FocusableRow>
          );
        }
        case "DOUBLE_CONFIRM_POWER_MANAGEMENT": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={toggleDoubleConfirmPowerManagement}
            >
              <span className="settings-menu-label">{item.label}</span>
              <ToggleButton
                isToggledOn={settings.doubleConfirmPowerManagement}
                labelOn={t("Disable")}
                labelOff={t("Enable")}
                onClick={toggleDoubleConfirmPowerManagement}
              />
            </FocusableRow>
          );
        }
        case "SDL_INPUT": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={toggleUseSdlInput}
            >
              <span className="settings-menu-label">{item.label}</span>
              <ToggleButton
                isToggledOn={settings.enableSdlInput}
                labelOn={t("Disable")}
                labelOff={t("Enable")}
                onClick={toggleUseSdlInput}
              />
            </FocusableRow>
          );
        }
        case "SHOW_HIDDEN": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={toggleShowHiddenGames}
            >
              <span className="settings-menu-label">{item.label}</span>
              <ToggleButton
                isToggledOn={settings.showHiddenGames}
                labelOn={t("Disable")}
                labelOff={t("Enable")}
                onClick={toggleShowHiddenGames}
              />
            </FocusableRow>
          );
        }
        case "SHOW_RUNNER_ICON": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={toggleShowRunnerIcon}
            >
              <span className="settings-menu-label">{item.label}</span>
              <ToggleButton
                isToggledOn={settings.showRunnerIcon}
                labelOn={t("Disable")}
                labelOff={t("Enable")}
                onClick={toggleShowRunnerIcon}
              />
            </FocusableRow>
          );
        }
        case "USE_REMOTE_DESKTOP_PORTAL": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={toggleUseRemoteDesktopPortal}
            >
              <span className="settings-menu-label">{item.label}</span>
              <ToggleButton
                isToggledOn={settings.useRemoteDesktopPortal}
                labelOn={t("Disable")}
                labelOff={t("Enable")}
                onClick={toggleUseRemoteDesktopPortal}
              />
            </FocusableRow>
          );
        }
        case "KEEP_GAMES_RUNNING": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={toggleKeepGamesRunningOnQuit}
            >
              <span className="settings-menu-label">{item.label}</span>
              <ToggleButton
                isToggledOn={settings.keepGamesRunningOnQuit}
                labelOn={t("Disable")}
                labelOff={t("Enable")}
                onClick={toggleKeepGamesRunningOnQuit}
              />
            </FocusableRow>
          );
        }
        case "ENABLE_UI_ACTION_SOUND_FEEDBACKS": {
          return (
            <FocusableRow
              ref={ref}
              isFocused={isFocused}
              onMouseEnter={onMouseEnter}
              onClick={toggleEnableUiActionSoundFeedbacks}
            >
              <span className="settings-menu-label">{item.label}</span>
              <ToggleButton
                isToggledOn={settings.enableUiActionSoundFeedbacks}
                labelOn={t("Disable")}
                labelOff={t("Enable")}
                onClick={toggleEnableUiActionSoundFeedbacks}
              />
            </FocusableRow>
          );
        }
        default: {
          return null;
        }
      }
    },
    [
      settings.zoomFactor,
      settings.gamepadAutorepeatMs,
      settings.showRecentlyPlayed,
      settings.doubleConfirmPowerManagement,
      settings.enableSdlInput,
      settings.showHiddenGames,
      settings.showRunnerIcon,
      settings.useRemoteDesktopPortal,
      settings.keepGamesRunningOnQuit,
      settings.enableUiActionSoundFeedbacks,
      nextSuspendMode,
      suspendModeLabel,
      nextLibrarySortMode,
      librarySortModeLabel,
      toggleShowRecentlyPlayed,
      t,
      toggleDoubleConfirmPowerManagement,
      toggleUseSdlInput,
      toggleShowHiddenGames,
      toggleShowRunnerIcon,
      toggleUseRemoteDesktopPortal,
      toggleKeepGamesRunningOnQuit,
      toggleEnableUiActionSoundFeedbacks,
    ],
  );

  const legendItems = useMemo(() => {
    const buttons = [];

    if (menuSections.length > 1) {
      buttons.push(
        { button: "L1", label: t("Prev Tab") },
        { button: "R1", label: t("Next Tab") },
      );
    }

    switch (focusedItem?.type) {
      case "ZOOM": {
        buttons.push(
          {
            button: "LEFT",
            label: t("Decrease"),
            onClick: decreaseZoom,
          },
          {
            button: "RIGHT",
            label: t("Increase"),
            onClick: increaseZoom,
          },
        );

        break;
      }
      case "GAMEPAD_AUTOREPEAT": {
        buttons.push(
          {
            button: "LEFT",
            label: t("Decrease"),
            onClick: decreaseAutorepeat,
          },
          {
            button: "RIGHT",
            label: t("Increase"),
            onClick: increaseAutorepeat,
          },
        );

        break;
      }
      case "SYSTEM_POWER_SUSPEND_MODE": {
        buttons.push(
          {
            button: "LEFT",
            label: t("Prev"),
            onClick: previousSuspendMode,
          },
          {
            button: "RIGHT",
            label: t("Next"),
            onClick: nextSuspendMode,
          },
        );

        break;
      }
      case "LIBRARY_SORT_MODE": {
        buttons.push(
          {
            button: "LEFT",
            label: t("Prev"),
            onClick: previousLibrarySortMode,
          },
          {
            button: "RIGHT",
            label: t("Next"),
            onClick: nextLibrarySortMode,
          },
          {
            button: "A",
            label: t("Next"),
            onClick: nextLibrarySortMode,
          },
        );

        break;
      }
      case "RECENTLY_PLAYED": {
        buttons.push({
          button: "A",
          label: settings.showRecentlyPlayed ? t("Disable") : t("Enable"),
          onClick: toggleShowRecentlyPlayed,
        });

        break;
      }
      case "SHOW_HIDDEN": {
        buttons.push({
          button: "A",
          label: settings.showHiddenGames ? t("Disable") : t("Enable"),
          onClick: toggleShowHiddenGames,
        });

        break;
      }
      case "SHOW_RUNNER_ICON": {
        buttons.push({
          button: "A",
          label: settings.showRunnerIcon ? t("Disable") : t("Enable"),
          onClick: toggleShowRunnerIcon,
        });

        break;
      }
      case "DOUBLE_CONFIRM_POWER_MANAGEMENT": {
        buttons.push({
          button: "A",
          label: settings.doubleConfirmPowerManagement
            ? t("Disable")
            : t("Enable"),
          onClick: toggleDoubleConfirmPowerManagement,
        });

        break;
      }
      case "SDL_INPUT": {
        buttons.push({
          button: "A",
          label: settings.enableSdlInput ? t("Disable") : t("Enable"),
          onClick: toggleUseSdlInput,
        });

        break;
      }
      case "USE_REMOTE_DESKTOP_PORTAL": {
        buttons.push({
          button: "A",
          label: settings.useRemoteDesktopPortal ? t("Disable") : t("Enable"),
          onClick: toggleUseRemoteDesktopPortal,
        });

        break;
      }
      case "KEEP_GAMES_RUNNING": {
        buttons.push({
          button: "A",
          label: settings.keepGamesRunningOnQuit ? t("Disable") : t("Enable"),
          onClick: toggleKeepGamesRunningOnQuit,
        });

        break;
      }
      case "ENABLE_UI_ACTION_SOUND_FEEDBACKS": {
        buttons.push({
          button: "A",
          label: settings.enableUiActionSoundFeedbacks
            ? t("Disable")
            : t("Enable"),
          onClick: toggleEnableUiActionSoundFeedbacks,
        });

        break;
      }
      // No default
    }

    buttons.push({ button: "B", label: t("Close"), onClick: onClose });

    return buttons;
  }, [
    menuSections.length,
    focusedItem?.type,
    t,
    onClose,
    decreaseZoom,
    increaseZoom,
    decreaseAutorepeat,
    increaseAutorepeat,
    previousSuspendMode,
    nextSuspendMode,
    previousLibrarySortMode,
    nextLibrarySortMode,
    settings.showRecentlyPlayed,
    settings.showHiddenGames,
    settings.showRunnerIcon,
    settings.doubleConfirmPowerManagement,
    settings.enableSdlInput,
    settings.useRemoteDesktopPortal,
    settings.keepGamesRunningOnQuit,
    settings.enableUiActionSoundFeedbacks,
    toggleShowRecentlyPlayed,
    toggleShowHiddenGames,
    toggleShowRunnerIcon,
    toggleDoubleConfirmPowerManagement,
    toggleUseSdlInput,
    toggleUseRemoteDesktopPortal,
    toggleKeepGamesRunningOnQuit,
    toggleEnableUiActionSoundFeedbacks,
  ]);

  return (
    <DialogLayout
      title={t("Settings")}
      legendItems={legendItems}
      className="wide"
      scrollable={false}
    >
      <RowBasedMenu
        sections={menuSections}
        renderItem={renderItem}
        onAction={handleAction}
        onFocusChange={setFocusedItem}
        focusId={SettingsMenuFocusId}
      />
    </DialogLayout>
  );
};

export default SettingsMenu;
