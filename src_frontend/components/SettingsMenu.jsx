import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import "../styles/SettingsMenu.css";
import * as ipc from "../utils/ipc";
import FocusableRow from "./FocusableRow";
import LegendaContainer from "./LegendaContainer";
import RowBasedMenu from "./RowBasedMenu";

export const SettingsMenuFocusId = "SettingsMenu";

const MIN_ZOOM = 0.5; // 50%
const MAX_ZOOM = 2.0; // 200%
const ZOOM_STEP = 0.05; // 5%

const SettingsMenu = ({ onClose }) => {
  const { t } = useTranslation();
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [focusedItem, setFocusedItem] = useState(null);

  useEffect(() => {
    const fetchZoom = async () => {
      try {
        const factor = await ipc.getWindowZoomFactor();
        setZoomFactor(factor);
      } catch (error) {
        ipc.logError("Failed to get window zoom factor:", error);
      }
    };
    fetchZoom();
  }, []);

  const handleZoomChange = useCallback((newFactor) => {
    const clampedFactor = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newFactor));
    const roundedFactor = Math.round(clampedFactor * 100) / 100;
    setZoomFactor(roundedFactor);
    ipc.setWindowZoomFactor(roundedFactor);
  }, []);

  const decreaseZoom = useCallback(() => {
    handleZoomChange(zoomFactor - ZOOM_STEP);
  }, [zoomFactor, handleZoomChange]);

  const increaseZoom = useCallback(() => {
    handleZoomChange(zoomFactor + ZOOM_STEP);
  }, [zoomFactor, handleZoomChange]);

  const menuItems = useMemo(() => {
    const result = [];

    if (zoomFactor !== null) {
      result.push({ type: "ZOOM", label: t("Zoom Level") });
    }

    return result;
  }, [t, zoomFactor]);

  const handleAction = useCallback(
    (actionName, item) => {
      if (actionName === "B") {
        onClose();
        return;
      }
      if (item.type === "ZOOM") {
        if (actionName === "LEFT") decreaseZoom();
        else if (actionName === "RIGHT") increaseZoom();
      }
    },
    [onClose, decreaseZoom, increaseZoom]
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => {
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
                    ((zoomFactor - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100
                  }%`,
                }}
              ></div>
            </div>
            <span className="settings-menu-value">{`${Math.round(
              zoomFactor * 100
            )}%`}</span>
          </div>
        </FocusableRow>
      );
    },
    [zoomFactor]
  );

  const legendItems = useMemo(() => {
    const buttons = [];

    if (focusedItem?.type === "ZOOM") {
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
        }
      );
    }

    buttons.push({ button: "B", label: t("Close"), onClick: onClose });

    return buttons;
  }, [decreaseZoom, increaseZoom, onClose, t, focusedItem]);

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
