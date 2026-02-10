import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import {
  useSettingsActions,
  useSettingsState,
} from "../contexts/SettingsContext";
import "../styles/SettingsMenu.css";
import FocusableRow from "./FocusableRow";
import LegendaContainer from "./LegendaContainer";
import RowBasedMenu from "./RowBasedMenu";
import ToggleButton from "./ToggleButton";

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

  const menuItems = useMemo(() => {
    const result = [];
    if (settings.zoomFactor !== undefined) {
      result.push({ type: "ZOOM", label: t("Zoom Level") });
    }
    if (settings.gamepadAutorepeatMs !== undefined) {
      result.push({
        type: "GAMEPAD_AUTOREPEAT",
        label: t("Gamepad Autorepeat Delay"),
      });
    }
    if (settings.showRecentlyPlayed !== undefined) {
      result.push({
        type: "RECENTLY_PLAYED",
        label: t("Recently Played Shelf"),
      });
    }
    if (settings.showHiddenGames !== undefined) {
      result.push({
        type: "SHOW_HIDDEN",
        label: t("Show Hidden Games"),
      });
    }
    if (settings.showRunnerIcon !== undefined) {
      result.push({
        type: "SHOW_RUNNER_ICON",
        label: t("Show Runner Icon"),
      });
    }
    if (settings.doubleConfirmPowerManagement !== undefined) {
      result.push({
        type: "DOUBLE_CONFIRM_POWER_MANAGEMENT",
        label: t("Double confirm power management"),
      });
    }
    if (settings.useRemoteDesktopPortal !== undefined) {
      result.push({
        type: "USE_REMOTE_DESKTOP_PORTAL",
        label: t("Use Remote Desktop Portal"),
      });
    }
    return result;
  }, [t, settings]);

  const handleAction = useCallback(
    (actionName, item) => {
      if (!item) return;

      if (actionName === "B") {
        onClose();
        return;
      }

      switch (item.type) {
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
              <div className="zoom-factor-display">
                <div className="zoom-factor-bar-container">
                  <div
                    className="zoom-factor-bar-fill"
                    style={{
                      width: `${
                        ((settings.zoomFactor - MIN_ZOOM) /
                          (MAX_ZOOM - MIN_ZOOM)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="settings-menu-value">{`${Math.round(
                  settings.zoomFactor * 100,
                )}%`}</span>
              </div>
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
              <div className="zoom-factor-display">
                <div className="zoom-factor-bar-container">
                  <div
                    className="zoom-factor-bar-fill"
                    style={{
                      width: `${
                        ((settings.gamepadAutorepeatMs - MIN_AUTOREPEAT) /
                          (MAX_AUTOREPEAT - MIN_AUTOREPEAT)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="settings-menu-value">
                  {settings.gamepadAutorepeatMs}ms
                </span>
              </div>
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
    ],
  );

  const legendItems = useMemo(() => {
    const buttons = [];

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
    }

    buttons.push({ button: "B", label: t("Close"), onClick: onClose });

    return buttons;
  }, [
    focusedItem,
    settings,
    decreaseZoom,
    increaseZoom,
    decreaseAutorepeat,
    increaseAutorepeat,
    toggleShowRecentlyPlayed,
    toggleShowHiddenGames,
    toggleShowRunnerIcon,
    toggleDoubleConfirmPowerManagement,
    toggleUseRemoteDesktopPortal,
    onClose,
    t,
  ]);

  return (
    <div className="settings-menu-container">
      <LegendaContainer legendItems={legendItems}>
        <div>
          <h2 className="settings-menu-title">{t("Settings")}</h2>
          <RowBasedMenu
            items={menuItems}
            renderItem={renderItem}
            onAction={handleAction}
            onFocusChange={setFocusedItem}
            focusId={SettingsMenuFocusId}
          />
        </div>
      </LegendaContainer>
    </div>
  );
};

export default SettingsMenu;
