import { useState, useEffect, useCallback, useMemo } from "react";
import "../styles/DisplaySettings.css";
import LegendaContainer from "./LegendaContainer";
import RowBasedMenu from "./RowBasedMenu";
import FocusableRow from "./FocusableRow";
import { useTranslation } from "../contexts/TranslationContext";
import { useIsMounted } from "../hooks/useIsMounted";
import PercentageBar from "./PercentageBar";
import ToggleButton from "./ToggleButton";
import * as api from "../utils/ipc";

export const DisplaySettingsFocusID = "DisplaySettings";

const CONTROL_TYPES = {
  BRIGHTNESS: "BRIGHTNESS",
  NIGHT_LIGHT: "NIGHT_LIGHT",
};

const DisplaySettings = ({ onClose }) => {
  const { t } = useTranslation();
  const isMounted = useIsMounted();
  const [nightLight, setNightLight] = useState(null);
  const [brightness, setBrightness] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [brightnessError, setBrightnessError] = useState(false);
  const [nightLightError, setNightLightError] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setBrightnessError(false);
    setNightLightError(false);

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

    try {
      const nl = await api.getNightLight();
      if (isMounted()) {
        setNightLight(nl);
      }
    } catch (_) {
      if (isMounted()) {
        setNightLightError(true);
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
      await api.setBrightness(clamped);
      if (isMounted()) {
        await fetchSettings();
      }
    },
    [brightnessError, fetchSettings, isMounted],
  );

  const toggleNightLight = useCallback(async () => {
    if (nightLightError) return;
    const newVal = !nightLight;
    await api.setNightLight(newVal);
    if (isMounted()) {
      await fetchSettings();
    }
  }, [nightLight, nightLightError, fetchSettings, isMounted]);

  const menuItems = useMemo(() => {
    const items = [];
    if (!brightnessError) {
      items.push({ type: CONTROL_TYPES.BRIGHTNESS, label: t("Brightness") });
    }
    if (!nightLightError) {
      items.push({ type: CONTROL_TYPES.NIGHT_LIGHT, label: t("Night Light") });
    }
    return items;
  }, [t, brightnessError, nightLightError]);

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
        case CONTROL_TYPES.NIGHT_LIGHT:
          if (actionName === "A") toggleNightLight();
          break;
      }
    },
    [brightness, updateBrightness, toggleNightLight, fetchSettings, onClose],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => {
      return (
        <FocusableRow
          key={item.type}
          isFocused={isFocused}
          onMouseEnter={onMouseEnter}
          onClick={
            item.type === CONTROL_TYPES.NIGHT_LIGHT
              ? toggleNightLight
              : undefined
          }
        >
          <span className="display-settings-label">{item.label}</span>
          {item.type === CONTROL_TYPES.BRIGHTNESS && (
            <PercentageBar percent={brightness} containerWidth="150px" />
          )}
          {item.type === CONTROL_TYPES.NIGHT_LIGHT && (
            <ToggleButton
              isToggledOn={nightLight}
              labelOn={t("Disable")}
              labelOff={t("Enable")}
              onClick={toggleNightLight}
            />
          )}
        </FocusableRow>
      );
    },
    [brightness, nightLight, t, toggleNightLight],
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

    if (focusedItem && focusedItem.type === CONTROL_TYPES.NIGHT_LIGHT) {
      items.push({
        button: "A",
        label: nightLight ? t("Disable") : t("Enable"),
        onClick: toggleNightLight,
      });
    }

    items.push({ button: "X", label: t("Reload"), onClick: fetchSettings });
    items.push({ button: "B", label: t("Close"), onClick: onClose });

    return items;
  }, [
    focusedItem,
    brightness,
    nightLight,
    updateBrightness,
    toggleNightLight,
    fetchSettings,
    onClose,
    t,
  ]);

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
