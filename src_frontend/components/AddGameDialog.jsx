import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLutrisActions } from "../contexts/LutrisContext";
import { useToastActions } from "../contexts/ToastContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useIsMounted } from "../hooks/useIsMounted";
import {
  buildGameInfoPayload,
  buildOptionsBySection,
  buildSectionPayload,
  isPathLikeItem,
  mergeOptionValues,
  slugifyValue,
} from "../utils/addGameDialog";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import LoadingIndicator from "./LoadingIndicator";
import OnScreenKeyboard from "./OnScreenKeyboard";
import Pathfinder from "./Pathfinder";
import RowBasedMenu from "./RowBasedMenu";
import SelectionMenu from "./SelectionMenu";
import ToggleButton from "./ToggleButton";

import "../styles/AddGameDialog.css";
import "../styles/SettingsMenu.css";

const AddGameDialogFocusId = "AddGameDialog";
const INITIAL_MENU_STATE = {
  activeSectionIndex: 0,
  selectedIndex: 0,
};

const AddGameDialog = ({ onClose, maxWidth = "860px" }) => {
  const { t } = useTranslation();
  const { showToast } = useToastActions();
  const { fetchGames } = useLutrisActions();
  const isMounted = useIsMounted();

  const [loadingRunners, setLoadingRunners] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const [focusedItem, setFocusedItem] = useState(null);
  const [modalState, setModalState] = useState(null);
  const [menuState, setMenuState] = useState(INITIAL_MENU_STATE);

  const [runners, setRunners] = useState([]);
  const [gameInfo, setGameInfo] = useState({});

  const [optionsBySection, setOptionsBySection] = useState({});
  const [tabDefinitions, setTabDefinitions] = useState([]);
  const [gameInfoFields, setGameInfoFields] = useState([]);

  const [optionValues, setOptionValues] = useState({});
  const initializedRef = useRef(false);

  const runnerChoices = useMemo(() => {
    return runners.map((runner) => [runner.human_name, runner.name]);
  }, [runners]);

  const openModal = useCallback((type, payload = {}) => {
    setModalState({ type, ...payload });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  const updateGameInfo = useCallback((key, value) => {
    setGameInfo((previous) => ({ ...previous, [key]: value }));
  }, []);

  const getGameInfoValue = useCallback(
    (key) => {
      if (key === "slug") {
        const explicitSlug = gameInfo[key];
        if (String(explicitSlug ?? "").trim()) {
          return explicitSlug;
        }
        return slugifyValue(gameInfo.name);
      }

      return gameInfo[key] ?? "";
    },
    [gameInfo],
  );

  const updateOptionValue = useCallback((section, key, value) => {
    setOptionValues((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [key]: value,
      },
    }));
  }, []);

  const openKeyboard = useCallback(
    (item) => {
      openModal("keyboard", { item });
    },
    [openModal],
  );

  const fetchSettingsForRunner = useCallback(
    async (runnerSlug) => {
      if (!runnerSlug) {
        setOptionsBySection({});
        setTabDefinitions([]);
        setGameInfoFields([]);
        setOptionValues({});
        return;
      }

      setLoadingSettings(true);
      try {
        const data = await api.getLutrisSettings(null, runnerSlug);
        if (!isMounted()) {
          return;
        }

        setTabDefinitions(data?.tabs || []);
        setGameInfoFields(data?.game_info_fields || []);

        const nextOptions = buildOptionsBySection(data?.tabs, data?.settings);

        setOptionsBySection(nextOptions);
        setOptionValues((previous) => {
          return mergeOptionValues(previous, nextOptions);
        });
      } finally {
        if (isMounted()) {
          setLoadingSettings(false);
        }
      }
    },
    [isMounted],
  );

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const loadRunners = async () => {
      setLoadingRunners(true);
      try {
        const data = await api.getLutrisRunners();
        if (!isMounted()) {
          return;
        }

        const availableRunners = data?.runners || [];
        setRunners(availableRunners);

        if (availableRunners.length === 0) {
          showToast({ title: t("No Lutris runners available"), type: "error" });
          onClose();
        } else {
          const initialRunner = availableRunners[0].name;
          setGameInfo((previous) => ({
            ...previous,
            runner: previous.runner || initialRunner,
          }));
          await fetchSettingsForRunner(initialRunner);
        }
      } catch {
        if (isMounted()) {
          showToast({
            title: t("Failed to fetch Lutris runners"),
            type: "error",
          });
          onClose();
        }
      } finally {
        if (isMounted()) {
          setLoadingRunners(false);
        }
      }
    };

    loadRunners();
  }, [fetchSettingsForRunner, isMounted, onClose, showToast, t]);

  const writeToTarget = useCallback(
    (targetItem, value) => {
      if (!targetItem) {
        return;
      }

      if (targetItem.kind === "option") {
        updateOptionValue(targetItem.section, targetItem.key, value);
        return;
      }

      updateGameInfo(targetItem.key, value);
    },
    [updateGameInfo, updateOptionValue],
  );

  const browsePath = useCallback(
    async (path, targetItem) => {
      try {
        const next = await api.browseLutrisPath(path || "~");
        if (!isMounted()) {
          return;
        }
        openModal("path-browser", {
          data: next,
          targetItem,
        });
      } catch {
        if (isMounted()) {
          showToast({ title: t("Failed to browse path"), type: "error" });
        }
      }
    },
    [isMounted, openModal, showToast, t],
  );

  const openPathBrowserForItem = useCallback(
    async (item) => {
      const initialPath = String(item.value || "").trim() || "~";
      await browsePath(initialPath, item);
    },
    [browsePath],
  );

  const activateItem = useCallback(
    (item) => {
      if (item.kind === "game_info" && item.key === "runner") {
        openModal("runner");
        return;
      }

      if (isPathLikeItem(item)) {
        openPathBrowserForItem(item);
        return;
      }

      if (item.type === "bool") {
        updateOptionValue(item.section, item.key, !item.value);
        return;
      }

      if (item.choices?.length > 0) {
        openModal("option", { item });
        return;
      }

      openKeyboard(item);
    },
    [openKeyboard, openModal, openPathBrowserForItem, updateOptionValue],
  );

  const getSectionPayload = useCallback(
    (sectionName) => {
      return buildSectionPayload(
        optionsBySection[sectionName],
        optionValues[sectionName],
      );
    },
    [optionValues, optionsBySection],
  );

  const onSave = useCallback(async () => {
    const name = String(getGameInfoValue("name")).trim();
    const runner = String(getGameInfoValue("runner")).trim();

    if (!name) {
      showToast({ title: t("Please fill in the name"), type: "error" });
      return;
    }

    if (!runner) {
      showToast({ title: t("Runner not provided"), type: "error" });
      return;
    }

    const gameInfoPayload = buildGameInfoPayload(
      gameInfoFields,
      getGameInfoValue,
    );

    setSaving(true);
    try {
      await api.addLutrisLocalGame({
        ...gameInfoPayload,
        name,
        runner,
        options: {
          game: getSectionPayload("game"),
          runner: getSectionPayload("runner"),
          system: getSectionPayload("system"),
        },
      });

      await fetchGames();
      showToast({ title: t("Game added"), type: "success" });
      onClose();
    } catch {
      showToast({ title: t("Failed to add game"), type: "error" });
    } finally {
      if (isMounted()) {
        setSaving(false);
      }
    }
  }, [
    fetchGames,
    gameInfoFields,
    getGameInfoValue,
    getSectionPayload,
    isMounted,
    onClose,
    showToast,
    t,
  ]);

  const selectRunner = useCallback(
    async (runnerSlug) => {
      updateGameInfo("runner", runnerSlug);
      await fetchSettingsForRunner(runnerSlug);
    },
    [fetchSettingsForRunner, updateGameInfo],
  );

  const renderSelectionModal = useCallback(
    ({ title, options, currentValue, onSelect }) => {
      return (
        <SelectionMenu
          title={title}
          options={options}
          currentValue={currentValue}
          maxWidth={maxWidth}
          onSelect={async (value) => {
            await onSelect(value);
            closeModal();
          }}
          onClose={closeModal}
        />
      );
    },
    [closeModal, maxWidth],
  );

  const menuSections = useMemo(() => {
    return tabDefinitions.map((tab) => {
      if (tab.kind === "game_info") {
        return {
          id: tab.id,
          label: t(tab.label),
          items: gameInfoFields.map((field) => ({
            id: `${tab.id}-${field.key}`,
            kind: "game_info",
            key: field.key,
            label: t(field.label),
            value: getGameInfoValue(field.key),
            type: field.type,
          })),
        };
      }

      return {
        id: tab.id,
        label: t(tab.label),
        items: (optionsBySection[tab.section] || []).map((option) => ({
          id: `${tab.section}-${option.key}`,
          kind: "option",
          section: tab.section,
          key: option.key,
          label: option.label || option.key,
          type: option.type,
          value: optionValues[tab.section]?.[option.key],
          choices: option.choices,
        })),
      };
    });
  }, [
    gameInfoFields,
    getGameInfoValue,
    optionValues,
    optionsBySection,
    t,
    tabDefinitions,
  ]);

  const getMenuItemControl = useCallback(
    (item) => {
      if (item.kind === "option" && item.type === "bool") {
        return (
          <ToggleButton
            isToggledOn={!!item.value}
            labelOn={t("Disable")}
            labelOff={t("Enable")}
          />
        );
      }

      if (item.kind === "option" && item.choices?.length > 0) {
        const found = item.choices.find(
          (choice) => String(choice[1]) === String(item.value),
        );
        return (
          <div className="settings-menu-value">
            {found ? found[0] : t("Default")}
          </div>
        );
      }

      if (item.kind === "game_info" && item.key === "runner") {
        const selectedRunner = runnerChoices.find(
          (choice) => String(choice[1]) === String(item.value),
        );
        return (
          <div className="settings-menu-value">
            {selectedRunner ? selectedRunner[0] : t("Select")}
          </div>
        );
      }

      return (
        <div className="settings-menu-value">{item.value || t("Set")}</div>
      );
    },
    [runnerChoices, t],
  );

  const renderMenuItem = useCallback(
    (item, isFocused, onMouseEnter) => {
      return (
        <FocusableRow
          key={item.id}
          isFocused={isFocused}
          onMouseEnter={onMouseEnter}
          onClick={() => activateItem(item)}
        >
          <span className="settings-menu-label">{item.label}</span>
          {getMenuItemControl(item)}
        </FocusableRow>
      );
    },
    [activateItem, getMenuItemControl],
  );

  const handleMenuAction = useCallback(
    (actionName, item) => {
      if (actionName === "B") {
        onClose();
        return;
      }

      if (actionName === "X") {
        onSave();
        return;
      }

      if (actionName !== "A" || !item) {
        return;
      }

      activateItem(item);
    },
    [activateItem, onClose, onSave],
  );

  const legendItems = useMemo(() => {
    const sectionButtons =
      menuSections.length > 1
        ? [
            { button: "L1", label: t("Prev") },
            { button: "R1", label: t("Next") },
          ]
        : [];

    const actionButtons = [];
    if (focusedItem) {
      let actionLabel = t("Select");
      if (focusedItem.kind === "option" && focusedItem.type === "bool") {
        actionLabel = focusedItem.value ? t("Disable") : t("Enable");
      }
      actionButtons.push({ button: "A", label: actionLabel });
    }

    return [
      ...sectionButtons,
      ...actionButtons,
      { button: "X", label: t("Save"), onClick: onSave },
      { button: "B", label: t("Close"), onClick: onClose },
    ];
  }, [focusedItem, menuSections.length, onClose, onSave, t]);

  const renderModal = useCallback(() => {
    if (!modalState) {
      return null;
    }

    if (modalState.type === "runner") {
      return renderSelectionModal({
        title: t("Runner"),
        options: runnerChoices,
        currentValue: getGameInfoValue("runner"),
        onSelect: selectRunner,
      });
    }

    if (modalState.type === "option") {
      const { item } = modalState;
      return renderSelectionModal({
        title: item.label,
        options: item.choices || [],
        currentValue: item.value,
        onSelect: (newValue) => {
          updateOptionValue(item.section, item.key, newValue);
        },
      });
    }

    if (modalState.type === "keyboard") {
      const { item } = modalState;
      return (
        <OnScreenKeyboard
          label={item.label}
          initialValue={String(item.value || "")}
          onConfirm={(value) => {
            writeToTarget(item, value);
            closeModal();
          }}
          onClose={closeModal}
        />
      );
    }

    if (modalState.type === "path-browser") {
      return (
        <Pathfinder
          data={modalState.data}
          targetItem={modalState.targetItem}
          maxWidth={maxWidth}
          onNavigate={browsePath}
          onSelectPath={(targetItem, path) => {
            writeToTarget(targetItem, path);
            closeModal();
          }}
          onClose={closeModal}
          t={t}
        />
      );
    }

    return null;
  }, [
    browsePath,
    closeModal,
    getGameInfoValue,
    maxWidth,
    modalState,
    renderSelectionModal,
    runnerChoices,
    selectRunner,
    t,
    updateOptionValue,
    writeToTarget,
  ]);

  const activeModal = renderModal();
  if (activeModal) {
    return activeModal;
  }

  return (
    <DialogLayout
      title={t("Add game")}
      description={t("Create a local installed game entry in Lutris.")}
      legendItems={legendItems}
      maxWidth={maxWidth}
      scrollable={false}
    >
      {loadingRunners || loadingSettings ? (
        <div className="add-game-dialog-loading">
          <LoadingIndicator />
        </div>
      ) : (
        <RowBasedMenu
          sections={menuSections}
          renderItem={renderMenuItem}
          onAction={handleMenuAction}
          onFocusChange={setFocusedItem}
          focusId={AddGameDialogFocusId}
          itemKey={(item) => item.id}
          initialSectionIndex={menuState.activeSectionIndex}
          initialSelectedIndex={menuState.selectedIndex}
          onStateChange={setMenuState}
          isActive={!saving}
        />
      )}
    </DialogLayout>
  );
};

export default AddGameDialog;
