import { useState, useCallback, useMemo, useEffect } from "react";

import { useAsyncEffect } from "../hooks/useAsyncEffect";
import { useIsMounted } from "../hooks/useIsMounted";
import RowBasedMenu from "../navigation/row_based_menu/RowBasedMenu";
import { useTranslation } from "../stores/translationStore";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import PercentageBar from "./PercentageBar";
import ToggleButton from "./ToggleButton";
import "../styles/DisplaySettings.css";
import { useViewActions } from "../stores/viewStore";

export const DisplaySettingsFocusID = "DisplaySettings";

const CONTROL_TYPES = {
  BRIGHTNESS: "BRIGHTNESS",
  NIGHT_LIGHT: "NIGHT_LIGHT",
};

const clampBrightness = (value) => Math.max(0, Math.min(100, value));

const DisplaySettings = ({ onClose }) => {
  const { t } = useTranslation();
  const isMounted = useIsMounted();
  const [nightLight, setNightLight] = useState(null);
  const [brightness, setBrightness] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [brightnessError, setBrightnessError] = useState(true);
  const [nightLightError, setNightLightError] = useState(true);
  const { resetSize } = useViewActions();

  const fetchSettings = useCallback(
    async ({ showLoading = true, isMountedCheck = isMounted } = {}) => {
      if (showLoading && isMountedCheck()) {
        setIsLoading(true);
      }

      try {
        const b = await api.getBrightness();
        if (isMountedCheck()) {
          setBrightness(b);
          setBrightnessError(false);
        }
      } catch {
        if (isMountedCheck()) {
          setBrightnessError(true);
        }
      }

      try {
        const nl = await api.getNightLight();
        if (isMountedCheck()) {
          setNightLight(nl);
          setNightLightError(false);
        }
      } catch {
        if (isMountedCheck()) {
          setNightLightError(true);
        }
      }

      if (isMountedCheck()) {
        setIsLoading(false);
      }
    },
    [isMounted],
  );

  useAsyncEffect(
    async (isMountedCheck) => {
      await fetchSettings({
        showLoading: false,
        isMountedCheck,
      });
    },
    [fetchSettings],
  );

  const updateBrightness = useCallback(
    async (nextBrightness = brightness) => {
      if (brightnessError) return;
      const clamped = clampBrightness(nextBrightness);
      if (isMounted()) {
        setIsLoading(true);
      }
      try {
        await api.setBrightness(clamped);
      } finally {
        await fetchSettings();
      }
    },
    [brightnessError, fetchSettings, brightness, isMounted],
  );

  const toggleNightLight = useCallback(async () => {
    if (nightLightError) return;
    const newValue = !nightLight;
    if (isMounted()) {
      setIsLoading(true);
    }
    try {
      await api.setNightLight(newValue);
    } finally {
      await fetchSettings();
    }
  }, [isMounted, nightLight, nightLightError, fetchSettings]);

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

      if (!item) return;

      switch (item.type) {
        case CONTROL_TYPES.BRIGHTNESS: {
          if (actionName === "LEFT")
            setBrightness(clampBrightness(brightness - 5));
          if (actionName === "RIGHT")
            setBrightness(clampBrightness(brightness + 5));
          if (actionName === "A") updateBrightness();
          break;
        }
        case CONTROL_TYPES.NIGHT_LIGHT: {
          if (actionName === "A") toggleNightLight();
          break;
        }
      }
    },
    [brightness, updateBrightness, toggleNightLight, fetchSettings, onClose],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter, ref) => {
      return (
        <FocusableRow
          ref={ref}
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
            <PercentageBar percent={brightness} />
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
      items.push(
        {
          button: "LEFT",
          label: t("Decrease"),
          onClick: () => updateBrightness(brightness - 5),
        },
        {
          button: "RIGHT",
          label: t("Increase"),
          onClick: () => updateBrightness(brightness + 5),
        },
        {
          button: "A",
          label: t("Update"),
          onClick: updateBrightness,
        },
      );
    }

    if (focusedItem && focusedItem.type === CONTROL_TYPES.NIGHT_LIGHT) {
      items.push({
        button: "A",
        label: nightLight ? t("Disable") : t("Enable"),
        onClick: toggleNightLight,
      });
    }

    items.push(
      { button: "X", label: t("Reload"), onClick: fetchSettings },
      { button: "B", label: t("Close"), onClick: onClose },
    );

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

  useEffect(() => {
    resetSize();
  }, [isLoading, resetSize]);

  if (isLoading) {
    return (
      <DialogLayout
        legendItems={[{ button: "B", label: t("Close"), onClick: onClose }]}
      >
        <div className="dialog-layout-loading">
          <p className="display-settings-title">
            {t("Loading Display Settings...")}
          </p>
        </div>
      </DialogLayout>
    );
  }

  return (
    <DialogLayout
      title={t("Display Settings")}
      legendItems={legendItems}
      className="wide"
      scrollable={false}
    >
      {brightnessError && (
        <p className="display-settings-error-msg">
          {t(
            "Failed to load brightness. Check your desktop environment compatibility.",
          )}
        </p>
      )}
      {nightLightError && (
        <p className="display-settings-error-msg">
          {t(
            "Failed to load night light. Check your desktop environment compatibility.",
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
    </DialogLayout>
  );
};

export default DisplaySettings;
