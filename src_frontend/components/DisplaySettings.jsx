import { useState, useEffect, useCallback, useMemo } from "react";
import "../styles/DisplaySettings.css";
import LegendaContainer from "./LegendaContainer";
import RowBasedMenu from "./RowBasedMenu";
import FocusableRow from "./FocusableRow";
import { useTranslation } from "../contexts/TranslationContext";
import { useIsMounted } from "../hooks/useIsMounted";
import PercentageBar from "./PercentageBar";
import * as api from "../utils/ipc";

export const DisplaySettingsFocusID = "DisplaySettings";

const CONTROL_TYPES = {
  BRIGHTNESS: "BRIGHTNESS",
};

const DisplaySettings = ({ onClose }) => {
  const { t } = useTranslation();
  const isMounted = useIsMounted();
  const [brightness, setBrightness] = useState(50);
  const [focusedItem, setFocusedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [brightnessError, setBrightnessError] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setBrightnessError(false);

    try {
      const b = await api.getBrightness();
      if (isMounted()) {
        setBrightness(b);
      }
    } catch (_) {
      if (isMounted()) {
        setBrightnessError(true);
      }
    }

    if (isMounted()) {
      setIsLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateBrightness = useCallback(
    async (newVal) => {
      if (brightnessError) return;
      const clamped = Math.max(0, Math.min(100, newVal));
      setBrightness(clamped);
      await api.setBrightness(clamped);
    },
    [brightnessError],
  );

  const menuItems = useMemo(() => {
    const items = [];
    if (!brightnessError) {
      items.push({ type: CONTROL_TYPES.BRIGHTNESS, label: t("Brightness") });
    }
    return items;
  }, [t, brightnessError]);

  const handleAction = useCallback(
    (actionName, item) => {
      if (actionName === "B") {
        onClose();
        return;
      }

      if (actionName === "X") {
        fetchSettings();
        return;
      }

      switch (item.type) {
        case CONTROL_TYPES.BRIGHTNESS:
          if (actionName === "LEFT") updateBrightness(brightness - 5);
          else if (actionName === "RIGHT") updateBrightness(brightness + 5);
          break;
      }
    },
    [brightness, updateBrightness, fetchSettings, onClose],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => {
      return (
        <FocusableRow
          key={item.type}
          isFocused={isFocused}
          onMouseEnter={onMouseEnter}
        >
          <span className="display-settings-label">{item.label}</span>
          {item.type === CONTROL_TYPES.BRIGHTNESS && (
            <PercentageBar percent={brightness} containerWidth="150px" />
          )}{" "}
        </FocusableRow>
      );
    },
    [brightness],
  );

  const legendItems = useMemo(() => {
    const items = [];

    if (focusedItem && focusedItem.type === CONTROL_TYPES.BRIGHTNESS) {
      items.push({
        button: "LEFT",
        label: t("Decrease"),
        onClick: () => updateBrightness(brightness - 5),
      });
      items.push({
        button: "RIGHT",
        label: t("Increase"),
        onClick: () => updateBrightness(brightness + 5),
      });
    }

    items.push({ button: "X", label: t("Reload"), onClick: fetchSettings });
    items.push({ button: "B", label: t("Close"), onClick: onClose });

    return items;
  }, [focusedItem, brightness, updateBrightness, fetchSettings, onClose, t]);

  if (isLoading && menuItems.length === 0) {
    return (
      <div className="display-settings-container">
        <LegendaContainer
          legendItems={[{ button: "B", label: t("Close"), onClick: onClose }]}
        >
          <div style={{ padding: "24px 0" }}>
            <p className="display-settings-title">
              {t("Loading Display Settings...")}
            </p>
          </div>
        </LegendaContainer>
      </div>
    );
  }

  return (
    <div className="display-settings-container">
      <LegendaContainer legendItems={legendItems}>
        <div>
          <h2 className="display-settings-title">{t("Display Settings")}</h2>
          {brightnessError && (
            <p className="display-settings-error-msg">
              {t(
                "Failed to load brightness. Check your desktop environment compatibility.",
              )}
            </p>
          )}
          <RowBasedMenu
            items={menuItems}
            renderItem={renderItem}
            onAction={handleAction}
            focusId={DisplaySettingsFocusID}
            onFocusChange={setFocusedItem}
            emptyMessage={t("No display settings available.")}
          />
        </div>
      </LegendaContainer>
    </div>
  );
};

export default DisplaySettings;
