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
    [updateSetting]
  );

  const decreaseZoom = useCallback(() => {
    handleZoomChange(settings.zoomFactor - ZOOM_STEP);
  }, [settings.zoomFactor, handleZoomChange]);

  const increaseZoom = useCallback(() => {
    handleZoomChange(settings.zoomFactor + ZOOM_STEP);
  }, [settings.zoomFactor, handleZoomChange]);

  const toggleShowRecentlyPlayed = useCallback(() => {
    updateSetting("showRecentlyPlayed", !settings.showRecentlyPlayed);
  }, [settings.showRecentlyPlayed, updateSetting]);

  const toggleShowHiddenGames = useCallback(() => {
    updateSetting("showHiddenGames", !settings.showHiddenGames);
  }, [settings.showHiddenGames, updateSetting]);

  const menuItems = useMemo(() => {
    const result = [];
    if (settings.zoomFactor !== undefined) {
      result.push({ type: "ZOOM", label: t("Zoom Level") });
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
        case "RECENTLY_PLAYED":
          if (actionName === "A") toggleShowRecentlyPlayed();
          break;
        case "SHOW_HIDDEN":
          if (actionName === "A") toggleShowHiddenGames();
          break;
        case "ZOOM":
          if (actionName === "LEFT") decreaseZoom();
          else if (actionName === "RIGHT") increaseZoom();
          break;
      }
    },
    [
      onClose,
      decreaseZoom,
      increaseZoom,
      toggleShowRecentlyPlayed,
      toggleShowHiddenGames,
    ]
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
                  settings.zoomFactor * 100
                )}%`}</span>
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
        default:
          return null;
      }
    },
    [settings, t, toggleShowRecentlyPlayed, toggleShowHiddenGames]
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
    }

    buttons.push({ button: "B", label: t("Close"), onClick: onClose });

    return buttons;
  }, [
    focusedItem,
    settings,
    decreaseZoom,
    increaseZoom,
    toggleShowRecentlyPlayed,
    toggleShowHiddenGames,
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
