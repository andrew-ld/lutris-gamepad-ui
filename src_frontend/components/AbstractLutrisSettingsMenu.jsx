import React, { useCallback, useMemo, useState } from "react";

import RowBasedMenu from "../navigation/row_based_menu/RowBasedMenu";
import { useTranslation } from "../stores/translationStore";
import { useViewActions } from "../stores/viewStore";

import DialogLayout from "./DialogLayout";
import FilePicker from "./FilePicker";
import FocusableRow from "./FocusableRow";
import LoadingIndicator from "./LoadingIndicator";
import OnScreenKeyboard from "./OnScreenKeyboard";
import SelectionMenu from "./SelectionMenu";
import ToggleButton from "./ToggleButton";

import "../styles/SettingsMenu.css";

const LutrisSettingsMenuFocusId = "LutrisSettingsMenu";

const TEXT_OPTION_TYPES = new Set(["string", "text", "command_line"]);
const PATH_OPTION_TYPES = new Set(["file", "directory"]);
const DEFAULT_SECTION_ORDER = ["system", "runner", "game"];

const hasChoices = (item) => item.choices && item.choices.length > 0;

const isTextOption = (item) =>
  TEXT_OPTION_TYPES.has(item.type) || item.type === "choice_with_entry";

const isPathOption = (item) => PATH_OPTION_TYPES.has(item.type);

const isLutrisOptionSupported = (item) => {
  if (!item) return false;
  if (item.type === "bool") return true;
  if (item.type === "choice") return hasChoices(item);
  if (item.type === "choice_with_entry") return true;
  if (isTextOption(item)) return true;
  return isPathOption(item);
};

const getSectionLabel = (section, labels, t) => {
  if (labels && labels[section]) {
    return labels[section];
  }
  return t(section.charAt(0).toUpperCase() + section.slice(1));
};

const getDisplayValue = (item, t) => {
  const value = item.value;
  if (value !== null && value !== undefined && value !== "") {
    return String(value);
  }

  const defaultValue = item.default;
  if (
    defaultValue !== null &&
    defaultValue !== undefined &&
    defaultValue !== ""
  ) {
    return String(defaultValue);
  }

  return t("Default");
};

const getPickerInitialPath = (item) => {
  const value = item.value || item.default || "";
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  if (item.type === "directory") {
    return value;
  }

  const separatorIndex = value.lastIndexOf("/");
  if (separatorIndex === 0) {
    return "/";
  }
  if (separatorIndex > 0) {
    return value.slice(0, separatorIndex);
  }
  return null;
};

const getPrimaryActionLabel = (item, t) => {
  if (!item || !isLutrisOptionSupported(item)) {
    return null;
  }
  if (item.type === "bool") {
    return item.value ? t("Disable") : t("Enable");
  }
  if (
    item.type === "choice" ||
    (item.type === "choice_with_entry" && hasChoices(item))
  ) {
    return t("Select");
  }
  if (isPathOption(item)) {
    return t("Browse");
  }
  return t("Edit");
};

const AbstractLutrisSettingsMenu = ({
  title,
  settings,
  loading,
  onClose,
  onUpdateSetting,
  onSubmit,
  submitLabel,
  sectionOrder = DEFAULT_SECTION_ORDER,
  sectionLabels,
  focusId = LutrisSettingsMenuFocusId,
}) => {
  const { t } = useTranslation();
  const { resetSize } = useViewActions();
  const [focusedItem, setFocusedItem] = useState(null);
  const [selectingItem, setSelectingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [pickingItem, setPickingItem] = useState(null);
  const [menuState, setMenuState] = useState({
    activeSectionIndex: 0,
    selectedIndex: 0,
  });

  const menuSections = useMemo(() => {
    if (!settings) return [];
    return sectionOrder
      .filter((section) => settings[section] && settings[section].length > 0)
      .map((section) => {
        const items = settings[section]
          .map((opt) => ({ ...opt, section }))
          .filter((opt) => isLutrisOptionSupported(opt));
        return {
          id: section,
          label: getSectionLabel(section, sectionLabels, t),
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [settings, sectionOrder, sectionLabels, t]);

  const updateItem = useCallback(
    async (item, value) => {
      await onUpdateSetting(item.section, item.key, value, item.type, item);
    },
    [onUpdateSetting],
  );

  const closeCurrentView = useCallback(() => {
    resetSize();
    onClose();
  }, [onClose, resetSize]);

  const openSubView = useCallback(
    (setItem, item) => {
      resetSize();
      setItem(item);
    },
    [resetSize],
  );

  const closeSubView = useCallback(
    (setItem) => {
      resetSize();
      setItem(null);
    },
    [resetSize],
  );

  const updateItemAndCloseSubView = useCallback(
    async (item, value, setItem) => {
      resetSize();
      await updateItem(item, value);
      closeSubView(setItem);
    },
    [closeSubView, resetSize, updateItem],
  );

  const handleAction = useCallback(
    (actionName, item) => {
      if (actionName === "B") {
        closeCurrentView();
        return;
      }

      if (actionName === "Y" && onSubmit) {
        onSubmit();
        return;
      }

      if (!item) return;

      if (actionName === "X") {
        if (item.type === "choice_with_entry" && hasChoices(item)) {
          openSubView(setEditingItem, item);
        }
        return;
      }

      if (actionName !== "A") return;

      if (item.type === "bool") {
        updateItem(item, !item.value);
      } else if (
        item.type === "choice" ||
        (item.type === "choice_with_entry" && hasChoices(item))
      ) {
        openSubView(setSelectingItem, item);
      } else if (isPathOption(item)) {
        openSubView(setPickingItem, item);
      } else if (isTextOption(item)) {
        openSubView(setEditingItem, item);
      }
    },
    [closeCurrentView, onSubmit, openSubView, updateItem],
  );

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter, ref) => {
      let control;

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
        hasChoices(item)
      ) {
        const choice = item.choices.find(
          (c) => String(c[1]) === String(item.value),
        );
        const label = choice ? choice[0] : getDisplayValue(item, t);
        control = <div className="settings-menu-value">{label}</div>;
      } else {
        control = (
          <div className="settings-menu-value generic">
            {getDisplayValue(item, t)}
          </div>
        );
      }

      return (
        <FocusableRow
          ref={ref}
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
      buttons.push(
        { button: "L1", label: t("Prev Tab") },
        { button: "R1", label: t("Next Tab") },
      );
    }

    const primaryAction = getPrimaryActionLabel(focusedItem, t);
    if (primaryAction) {
      buttons.push({ button: "A", label: primaryAction });
    }

    if (
      focusedItem &&
      focusedItem.type === "choice_with_entry" &&
      hasChoices(focusedItem)
    ) {
      buttons.push({ button: "X", label: t("Edit") });
    }

    if (onSubmit) {
      buttons.push({ button: "Y", label: submitLabel || t("Save") });
    }

    buttons.push({ button: "B", label: t("Close"), onClick: closeCurrentView });
    return buttons;
  }, [
    menuSections.length,
    closeCurrentView,
    onSubmit,
    submitLabel,
    t,
    focusedItem,
  ]);

  if (selectingItem && !loading) {
    return (
      <SelectionMenu
        title={selectingItem.label}
        options={selectingItem.choices}
        currentValue={selectingItem.value}
        onSelect={async (newValue) => {
          await updateItemAndCloseSubView(
            selectingItem,
            newValue,
            setSelectingItem,
          );
        }}
        onClose={() => closeSubView(setSelectingItem)}
      />
    );
  }

  if (editingItem && !loading) {
    return (
      <OnScreenKeyboard
        label={editingItem.label}
        initialValue={String(editingItem.value || "")}
        onConfirm={async (newValue) => {
          await updateItemAndCloseSubView(
            editingItem,
            newValue,
            setEditingItem,
          );
        }}
        onClose={() => closeSubView(setEditingItem)}
      />
    );
  }

  if (pickingItem && !loading) {
    return (
      <FilePicker
        title={pickingItem.label}
        mode={pickingItem.type}
        initialPath={getPickerInitialPath(pickingItem)}
        onSelect={async (newValue) => {
          await updateItemAndCloseSubView(
            pickingItem,
            newValue,
            setPickingItem,
          );
        }}
        onClose={() => closeSubView(setPickingItem)}
      />
    );
  }

  return (
    <DialogLayout
      title={title}
      legendItems={legendItems}
      className="wide"
      scrollable={false}
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
            focusId={focusId}
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

export default React.memo(AbstractLutrisSettingsMenu);
