import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import { useIsMounted } from "../hooks/useIsMounted";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import LoadingIndicator from "./LoadingIndicator";
import RowBasedMenu from "./RowBasedMenu";
import SelectionMenu from "./SelectionMenu";
import ToggleButton from "./ToggleButton";

import "../styles/SettingsMenu.css";

export const LutrisSettingsMenuFocusId = "LutrisSettingsMenu";

const LutrisSettingsMenu = ({
  gameSlug = null,
  runnerSlug = null,
  onClose,
  maxWidth = "700px",
}) => {
  const { t } = useTranslation();
  const isMounted = useIsMounted();
  const [settings, setSettings] = useState(null);
  const [gameName, setGameName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [focusedItem, setFocusedItem] = useState(null);
  const [selectingItem, setSelectingItem] = useState(null);
  const [menuState, setMenuState] = useState({
    activeSectionIndex: 0,
    selectedIndex: 0,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLutrisSettings(gameSlug, runnerSlug);
      if (isMounted() && data && data.settings) {
        setSettings(data.settings);
        if (data.game_name) {
          setGameName(data.game_name);
        }
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [gameSlug, runnerSlug, isMounted]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const isOptionSupported = (item) => {
    return (
      item.type === "bool" ||
      ((item.type === "choice" || item.type === "choice_with_entry") &&
        item.choices &&
        item.choices.length > 0)
    );
  };

  const updateSetting = useCallback(
    async (section, key, value, type) => {
      setLoading(true);
      try {
        await api.updateLutrisSetting(
          section,
          key,
          value,
          type,
          gameSlug,
          runnerSlug,
        );
        if (isMounted()) {
          await fetchSettings();
        }
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
      }
    },
    [gameSlug, runnerSlug, fetchSettings, isMounted],
  );

  const menuSections = useMemo(() => {
    if (!settings) return [];
    const sectionOrder = ["system", "runner", "game"];
    return sectionOrder
      .filter((s) => settings[s] && settings[s].length > 0)
      .map((section) => {
        const items = settings[section]
          .map((opt) => ({ ...opt, section }))
          .filter(isOptionSupported);
        return {
          id: section,
          label: t(section.charAt(0).toUpperCase() + section.slice(1)),
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [settings, t]);

  const handleAction = useCallback(
    (actionName, item) => {
      if (!item) return;

      if (actionName === "B") {
        onClose();
        return;
      }

      if (actionName === "A") {
        if (item.type === "bool") {
          updateSetting(item.section, item.key, !item.value, item.type);
        } else if (item.choices && item.choices.length > 0) {
          setSelectingItem(item);
        }
      }
    },
    [onClose, updateSetting],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => {
      let control = null;

      if (item.type === "bool") {
        control = (
          <ToggleButton
            isToggledOn={!!item.value}
            labelOn={t("Disable")}
            labelOff={t("Enable")}
          />
        );
      } else if (
        (item.type === "choice" || item.type === "choice_with_entry") &&
        item.choices &&
        item.choices.length > 0
      ) {
        const choice = item.choices.find(
          (c) => String(c[1]) === String(item.value),
        );
        const label = choice ? choice[0] : item.value || t("Default");
        control = <div className="settings-menu-value">{label}</div>;
      }

      return (
        <FocusableRow
          key={`${item.section}-${item.key}`}
          isFocused={isFocused}
          onMouseEnter={onMouseEnter}
          onClick={() => handleAction("A", item)}
        >
          <span className="settings-menu-label">{item.label}</span>
          {control}
        </FocusableRow>
      );
    },
    [handleAction, t],
  );

  const legendItems = useMemo(() => {
    const buttons = [];
    if (menuSections.length > 1) {
      buttons.push({ button: "L1", label: t("Prev") });
      buttons.push({ button: "R1", label: t("Next") });
    }
    if (focusedItem && isOptionSupported(focusedItem)) {
      let label = t("Select");
      if (focusedItem.type === "bool") {
        label = focusedItem.value ? t("Disable") : t("Enable");
      }
      buttons.push({
        button: "A",
        label,
      });
    }
    buttons.push({ button: "B", label: t("Close"), onClick: onClose });
    return buttons;
  }, [menuSections.length, onClose, t, focusedItem]);

  const currentTitle = useMemo(() => {
    if (gameName) {
      return t("Settings: {{name}}", { name: gameName });
    }
    return t("Lutris Settings");
  }, [gameName, t]);

  if (selectingItem && !loading) {
    return (
      <SelectionMenu
        title={selectingItem.label}
        options={selectingItem.choices}
        currentValue={selectingItem.value}
        maxWidth={maxWidth}
        onSelect={async (newValue) => {
          await updateSetting(
            selectingItem.section,
            selectingItem.key,
            newValue,
            selectingItem.type,
          );
          setSelectingItem(null);
        }}
        onClose={() => setSelectingItem(null)}
      />
    );
  }

  return (
    <DialogLayout
      title={currentTitle}
      legendItems={legendItems}
      maxWidth={maxWidth}
    >
      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <LoadingIndicator />
        </div>
      ) : (
        settings && (
          <RowBasedMenu
            sections={menuSections}
            renderItem={renderItem}
            onAction={handleAction}
            onFocusChange={setFocusedItem}
            focusId={LutrisSettingsMenuFocusId}
            itemKey={(item) => `${item.section}-${item.key}`}
            initialSectionIndex={menuState.activeSectionIndex}
            initialSelectedIndex={menuState.selectedIndex}
            onStateChange={setMenuState}
          />
        )
      )}
    </DialogLayout>
  );
};

export default LutrisSettingsMenu;
