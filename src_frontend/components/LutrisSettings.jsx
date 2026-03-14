import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { useIsMounted } from "../hooks/useIsMounted";
import * as api from "../utils/ipc";
import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import RowBasedMenu from "./RowBasedMenu";
import ToggleButton from "./ToggleButton";
import "../styles/DisplaySettings.css";
import "../styles/SettingsMenu.css";

export const LutrisSettingsFocusId = "LutrisSettings";

const CONTROL_TYPES = {
  D3D_EXTRAS: "D3D_EXTRAS",
  DXVK: "DXVK",
  ESYNC: "ESYNC",
  FSYNC: "FSYNC",
  PROTON_VERSION: "PROTON_VERSION",
};

const LUTRIS_BOOL_SETTINGS = {
  [CONTROL_TYPES.D3D_EXTRAS]: {
    stateKey: "d3dExtrasEnabled",
    settingKey: "d3d_extras",
  },
  [CONTROL_TYPES.DXVK]: {
    stateKey: "dxvkEnabled",
    settingKey: "dxvk",
  },
  [CONTROL_TYPES.ESYNC]: {
    stateKey: "esyncEnabled",
    settingKey: "esync",
  },
  [CONTROL_TYPES.FSYNC]: {
    stateKey: "fsyncEnabled",
    settingKey: "fsync",
  },
};

const LutrisSettings = ({ onClose }) => {
  const { t } = useTranslation();
  const isMounted = useIsMounted();

  const [focusedItem, setFocusedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [lutrisConfig, setLutrisConfig] = useState({
    protonVersion: null,
    availableProtonVersions: [],
    dxvkEnabled: false,
    d3dExtrasEnabled: false,
    esyncEnabled: false,
    fsyncEnabled: false,
  });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const config = await api.getLutrisConfig();

      if (!isMounted()) {
        return;
      }

      setLutrisConfig({
        protonVersion: config?.protonVersion || null,
        availableProtonVersions: config?.availableProtonVersions || [],
        dxvkEnabled: Boolean(config?.dxvkEnabled),
        d3dExtrasEnabled: Boolean(config?.d3dExtrasEnabled),
        esyncEnabled: Boolean(config?.esyncEnabled),
        fsyncEnabled: Boolean(config?.fsyncEnabled),
      });
    } catch (error) {
      api.logError("Failed to load Lutris config:", error);

      if (isMounted()) {
        setHasLoadError(true);
        setLutrisConfig((currentConfig) => ({
          ...currentConfig,
          availableProtonVersions: [],
        }));
      }
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const currentVersionIndex = useMemo(() => {
    return lutrisConfig.availableProtonVersions.findIndex(
      (option) => option.value === lutrisConfig.protonVersion,
    );
  }, [lutrisConfig.availableProtonVersions, lutrisConfig.protonVersion]);

  const currentVersionLabel =
    lutrisConfig.availableProtonVersions[currentVersionIndex]?.label ||
    lutrisConfig.protonVersion ||
    "-";

  const updateProtonVersion = useCallback(
    async (direction) => {
      if (isSaving || lutrisConfig.availableProtonVersions.length === 0) {
        return;
      }

      const currentIndex = currentVersionIndex >= 0 ? currentVersionIndex : 0;
      const nextIndex =
        (currentIndex + direction + lutrisConfig.availableProtonVersions.length) %
        lutrisConfig.availableProtonVersions.length;
      const nextVersion = lutrisConfig.availableProtonVersions[nextIndex]?.value;

      if (!nextVersion || nextVersion === lutrisConfig.protonVersion) {
        return;
      }

      setIsSaving(true);
      setHasLoadError(false);

      try {
        const updatedConfig = await api.setLutrisProtonVersion(nextVersion);

        if (isMounted()) {
          setLutrisConfig((currentConfig) => ({
            ...currentConfig,
            protonVersion: updatedConfig?.protonVersion || nextVersion,
            availableProtonVersions:
              updatedConfig?.availableProtonVersions ||
              currentConfig.availableProtonVersions,
            dxvkEnabled:
              updatedConfig?.dxvkEnabled ?? currentConfig.dxvkEnabled,
            d3dExtrasEnabled:
              updatedConfig?.d3dExtrasEnabled ?? currentConfig.d3dExtrasEnabled,
            esyncEnabled:
              updatedConfig?.esyncEnabled ?? currentConfig.esyncEnabled,
            fsyncEnabled:
              updatedConfig?.fsyncEnabled ?? currentConfig.fsyncEnabled,
          }));
        }
      } catch (error) {
        api.logError("Failed to update Lutris proton version:", error);

        if (isMounted()) {
          setHasLoadError(true);
        }
      } finally {
        if (isMounted()) {
          setIsSaving(false);
        }
      }
    },
    [
      currentVersionIndex,
      isMounted,
      isSaving,
      lutrisConfig.availableProtonVersions,
      lutrisConfig.protonVersion,
    ],
  );

  const updateBooleanSetting = useCallback(
    async (settingType) => {
      if (isSaving) {
        return;
      }

      const setting = LUTRIS_BOOL_SETTINGS[settingType];
      if (!setting) {
        return;
      }

      const nextValue = !lutrisConfig[setting.stateKey];

      setIsSaving(true);
      setHasLoadError(false);

      try {
        const updatedConfig = await api.setLutrisBoolSetting(
          setting.settingKey,
          nextValue,
        );

        if (isMounted()) {
          setLutrisConfig((currentConfig) => ({
            ...currentConfig,
            protonVersion:
              updatedConfig?.protonVersion ?? currentConfig.protonVersion,
            availableProtonVersions:
              updatedConfig?.availableProtonVersions ||
              currentConfig.availableProtonVersions,
            dxvkEnabled:
              updatedConfig?.dxvkEnabled ?? currentConfig.dxvkEnabled,
            d3dExtrasEnabled:
              updatedConfig?.d3dExtrasEnabled ?? currentConfig.d3dExtrasEnabled,
            esyncEnabled:
              updatedConfig?.esyncEnabled ?? currentConfig.esyncEnabled,
            fsyncEnabled:
              updatedConfig?.fsyncEnabled ?? currentConfig.fsyncEnabled,
          }));
        }
      } catch (error) {
        api.logError("Failed to update Lutris boolean setting:", settingType, error);

        if (isMounted()) {
          setHasLoadError(true);
        }
      } finally {
        if (isMounted()) {
          setIsSaving(false);
        }
      }
    },
    [isMounted, isSaving, lutrisConfig],
  );

  const menuItems = useMemo(() => {
    const items = [
      {
        type: CONTROL_TYPES.DXVK,
        label: t("DXVK"),
      },
      {
        type: CONTROL_TYPES.D3D_EXTRAS,
        label: t("D3D Extras"),
      },
      {
        type: CONTROL_TYPES.ESYNC,
        label: t("Esync"),
      },
      {
        type: CONTROL_TYPES.FSYNC,
        label: t("Fsync"),
      },
    ];

    if (lutrisConfig.availableProtonVersions.length > 0) {
      items.unshift({
        type: CONTROL_TYPES.PROTON_VERSION,
        label: t("Proton Version"),
      });
    }

    return items;
  }, [lutrisConfig.availableProtonVersions.length, t]);

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

      if (!item || isSaving) {
        return;
      }

      switch (item.type) {
        case CONTROL_TYPES.PROTON_VERSION:
          if (actionName === "LEFT") {
            updateProtonVersion(-1);
          } else if (actionName === "RIGHT") {
            updateProtonVersion(1);
          }
          break;
        case CONTROL_TYPES.DXVK:
        case CONTROL_TYPES.D3D_EXTRAS:
        case CONTROL_TYPES.ESYNC:
        case CONTROL_TYPES.FSYNC:
          if (actionName === "A") {
            updateBooleanSetting(item.type);
          }
          break;
      }
    },
    [fetchSettings, isSaving, onClose, updateBooleanSetting, updateProtonVersion],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => {
      const boolSetting = LUTRIS_BOOL_SETTINGS[item.type];

      return (
        <FocusableRow
          key={item.type}
          isFocused={isFocused}
          onMouseEnter={onMouseEnter}
        >
          <span className="settings-menu-label">{item.label}</span>
          {item.type === CONTROL_TYPES.PROTON_VERSION ? (
            <span className="settings-menu-value">{currentVersionLabel}</span>
          ) : (
            <ToggleButton
              isToggledOn={Boolean(lutrisConfig[boolSetting.stateKey])}
              labelOn={t("Disable")}
              labelOff={t("Enable")}
              onClick={() => updateBooleanSetting(item.type)}
            />
          )}
        </FocusableRow>
      );
    },
    [currentVersionLabel, lutrisConfig, t, updateBooleanSetting],
  );

  const legendItems = useMemo(() => {
    const items = [];

    if (
      focusedItem?.type === CONTROL_TYPES.PROTON_VERSION &&
      lutrisConfig.availableProtonVersions.length > 1 &&
      !isSaving
    ) {
      items.push({
        button: "LEFT",
        label: t("Prev"),
        onClick: () => updateProtonVersion(-1),
      });
      items.push({
        button: "RIGHT",
        label: t("Next"),
        onClick: () => updateProtonVersion(1),
      });
    }

    if (
      focusedItem &&
      Object.prototype.hasOwnProperty.call(LUTRIS_BOOL_SETTINGS, focusedItem.type) &&
      !isSaving
    ) {
      const { stateKey } = LUTRIS_BOOL_SETTINGS[focusedItem.type];
      items.push({
        button: "A",
        label: lutrisConfig[stateKey] ? t("Disable") : t("Enable"),
        onClick: () => updateBooleanSetting(focusedItem.type),
      });
    }

    items.push({ button: "X", label: t("Reload"), onClick: fetchSettings });
    items.push({ button: "B", label: t("Close"), onClick: onClose });

    return items;
  }, [
    fetchSettings,
    focusedItem,
    isSaving,
    lutrisConfig,
    onClose,
    t,
    updateBooleanSetting,
    updateProtonVersion,
  ]);

  if (isLoading) {
    return (
      <DialogLayout
        legendItems={legendItems}
        maxWidth="600px"
        title={t("Lutris Settings")}
      >
        <div style={{ padding: "24px 0" }}>
          <p className="display-settings-title">
            {t("Loading Lutris Settings...")}
          </p>
        </div>
      </DialogLayout>
    );
  }

  return (
    <DialogLayout
      title={t("Lutris Settings")}
      description={isSaving ? t("Updating Lutris setting...") : undefined}
      legendItems={legendItems}
      maxWidth="600px"
    >
      {hasLoadError && (
        <p className="display-settings-error-msg">
          {t("Failed to load or update Lutris settings.")}
        </p>
      )}
      <RowBasedMenu
        items={menuItems}
        renderItem={renderItem}
        onAction={handleAction}
        focusId={LutrisSettingsFocusId}
        onFocusChange={setFocusedItem}
        emptyMessage={t("No proton versions available.")}
      />
    </DialogLayout>
  );
};

export default LutrisSettings;
