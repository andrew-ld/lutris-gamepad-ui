import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import {
  useSettingsActions,
  useSettingsState,
} from "../contexts/SettingsContext";
import "../styles/SettingsMenu.css";
import FocusableRow from "./FocusableRow";
import DialogLayout from "./DialogLayout";
import RowBasedMenu from "./RowBasedMenu";
import ToggleButton from "./ToggleButton";
import PercentageBar from "./PercentageBar";

export const SettingsMenuFocusId = "SettingsMenu";

const MIN_ZOOM = 0.5; // 50%
const MAX_ZOOM = 2.0; // 200%
const ZOOM_STEP = 0.05; // 5%

const MIN_AUTOREPEAT = 100; // 100ms
const MAX_AUTOREPEAT = 500; // 500ms
const AUTOREPEAT_STEP = 25; // 25ms

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
    (newVal) => {
      const clampedVal = Math.max(
        MIN_AUTOREPEAT,
        Math.min(MAX_AUTOREPEAT, newVal),
      );
      updateSetting("gamepadAutorepeatMs", clampedVal);
    },
    [updateSetting],
  );

  const decreaseAutorepeat = useCallback(() => {
    handleAutorepeatChange(settings.gamepadAutorepeatMs - AUTOREPEAT_STEP);
  }, [settings, handleAutorepeatChange]);

  const increaseAutorepeat = useCallback(() => {
    handleAutorepeatChange(settings.gamepadAutorepeatMs + AUTOREPEAT_STEP);
  }, [settings, handleAutorepeatChange]);

  const toggleShowRecentlyPlayed = useCallback(() => {
    updateSetting("showRecentlyPlayed", !settings.showRecentlyPlayed);
  }, [settings, updateSetting]);

  const toggleShowHiddenGames = useCallback(() => {
    updateSetting("showHiddenGames", !settings.showHiddenGames);
  }, [settings, updateSetting]);

  const toggleShowRunnerIcon = useCallback(() => {
    updateSetting("showRunnerIcon", !settings.showRunnerIcon);
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
        case "ENABLE_UI_ACTION_SOUND_FEEDBACKS":
          if (actionName === "A") toggleEnableUiActionSoundFeedbacks();
          break;
        case "KEEP_GAMES_RUNNING":
          if (actionName === "A") toggleKeepGamesRunningOnQuit();
          break;
        case "USE_REMOTE_DESKTOP_PORTAL":
          if (actionName === "A") toggleUseRemoteDesktopPortal();
          break;
        case "DOUBLE_CONFIRM_POWER_MANAGEMENT":
          if (actionName === "A") toggleDoubleConfirmPowerManagement();
          break;
        case "RECENTLY_PLAYED":
          if (actionName === "A") toggleShowRecentlyPlayed();
          break;
        case "SHOW_HIDDEN":
          if (actionName === "A") toggleShowHiddenGames();
          break;
        case "SHOW_RUNNER_ICON":
          if (actionName === "A") toggleShowRunnerIcon();
          break;
        case "ZOOM":
          if (actionName === "LEFT") decreaseZoom();
          else if (actionName === "RIGHT") increaseZoom();
          break;
        case "GAMEPAD_AUTOREPEAT":
          if (actionName === "LEFT") decreaseAutorepeat();
          else if (actionName === "RIGHT") increaseAutorepeat();
          break;
      }
    },
    [
      onClose,
      decreaseZoom,
      increaseZoom,
      decreaseAutorepeat,
      increaseAutorepeat,
      toggleShowRecentlyPlayed,
      toggleShowHiddenGames,
      toggleShowRunnerIcon,
      toggleDoubleConfirmPowerManagement,
      toggleUseRemoteDesktopPortal,
      toggleKeepGamesRunningOnQuit,
      toggleEnableUiActionSoundFeedbacks,
    ],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => {
      switch (item.type) {
        case "ZOOM":
          return (
            <FocusableRow
              key={item.type}
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
                containerWidth="120px"
              />
            </FocusableRow>
          );
        case "GAMEPAD_AUTOREPEAT":
          return (
            <FocusableRow
              key={item.type}
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
                containerWidth="120px"
              />
            </FocusableRow>
          );
        case "RECENTLY_PLAYED":
          return (
            <FocusableRow
              key={item.type}
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
        case "DOUBLE_CONFIRM_POWER_MANAGEMENT":
          return (
            <FocusableRow
              key={item.type}
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
        case "SHOW_HIDDEN":
          return (
            <FocusableRow
              key={item.type}
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
        case "SHOW_RUNNER_ICON":
          return (
            <FocusableRow
              key={item.type}
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
        case "USE_REMOTE_DESKTOP_PORTAL":
          return (
            <FocusableRow
              key={item.type}
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
        case "KEEP_GAMES_RUNNING":
          return (
            <FocusableRow
              key={item.type}
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
        case "ENABLE_UI_ACTION_SOUND_FEEDBACKS":
          return (
            <FocusableRow
              key={item.type}
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
        default:
          return null;
      }
    },
    [
      settings,
      t,
      toggleShowRecentlyPlayed,
      toggleShowHiddenGames,
      toggleShowRunnerIcon,
      toggleDoubleConfirmPowerManagement,
      toggleUseRemoteDesktopPortal,
      toggleKeepGamesRunningOnQuit,
      toggleEnableUiActionSoundFeedbacks,
    ],
  );

  const legendItems = useMemo(() => {
    const buttons = [];

    if (menuSections.length > 1) {
      buttons.push({ button: "L1", label: t("Prev") });
      buttons.push({ button: "R1", label: t("Next") });
    }

    if (focusedItem?.type === "ZOOM") {
      buttons.push({
        button: "LEFT",
        label: t("Decrease"),
        onClick: decreaseZoom,
      });
      buttons.push({
        button: "RIGHT",
        label: t("Increase"),
        onClick: increaseZoom,
      });
    } else if (focusedItem?.type === "GAMEPAD_AUTOREPEAT") {
      buttons.push({
        button: "LEFT",
        label: t("Decrease"),
        onClick: decreaseAutorepeat,
      });
      buttons.push({
        button: "RIGHT",
        label: t("Increase"),
        onClick: increaseAutorepeat,
      });
    } else if (focusedItem?.type === "RECENTLY_PLAYED") {
      buttons.push({
        button: "A",
        label: settings.showRecentlyPlayed ? t("Disable") : t("Enable"),
        onClick: toggleShowRecentlyPlayed,
      });
    } else if (focusedItem?.type === "SHOW_HIDDEN") {
      buttons.push({
        button: "A",
        label: settings.showHiddenGames ? t("Disable") : t("Enable"),
        onClick: toggleShowHiddenGames,
      });
    } else if (focusedItem?.type === "SHOW_RUNNER_ICON") {
      buttons.push({
        button: "A",
        label: settings.showRunnerIcon ? t("Disable") : t("Enable"),
        onClick: toggleShowRunnerIcon,
      });
    } else if (focusedItem?.type === "DOUBLE_CONFIRM_POWER_MANAGEMENT") {
      buttons.push({
        button: "A",
        label: settings.doubleConfirmPowerManagement
          ? t("Disable")
          : t("Enable"),
        onClick: toggleDoubleConfirmPowerManagement,
      });
    } else if (focusedItem?.type === "USE_REMOTE_DESKTOP_PORTAL") {
      buttons.push({
        button: "A",
        label: settings.useRemoteDesktopPortal ? t("Disable") : t("Enable"),
        onClick: toggleUseRemoteDesktopPortal,
      });
    } else if (focusedItem?.type === "KEEP_GAMES_RUNNING") {
      buttons.push({
        button: "A",
        label: settings.keepGamesRunningOnQuit ? t("Disable") : t("Enable"),
        onClick: toggleKeepGamesRunningOnQuit,
      });
    } else if (focusedItem?.type === "ENABLE_UI_ACTION_SOUND_FEEDBACKS") {
      buttons.push({
        button: "A",
        label: settings.enableUiActionSoundFeedbacks
          ? t("Disable")
          : t("Enable"),
        onClick: toggleEnableUiActionSoundFeedbacks,
      });
    }

    buttons.push({ button: "B", label: t("Close"), onClick: onClose });

    return buttons;
  }, [
    focusedItem,
    settings,
    menuSections.length,
    decreaseZoom,
    increaseZoom,
    decreaseAutorepeat,
    increaseAutorepeat,
    toggleShowRecentlyPlayed,
    toggleShowHiddenGames,
    toggleShowRunnerIcon,
    toggleDoubleConfirmPowerManagement,
    toggleUseRemoteDesktopPortal,
    toggleKeepGamesRunningOnQuit,
    toggleEnableUiActionSoundFeedbacks,
    onClose,
    t,
  ]);

  return (
    <DialogLayout
      title={t("Settings")}
      legendItems={legendItems}
      maxWidth="600px"
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
