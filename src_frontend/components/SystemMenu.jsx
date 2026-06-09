import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGlobalShortcut } from "../hooks/useGlobalShortcut";
import { usePlayButtonActionSound } from "../hooks/usePlayButtonActionSound";
import { useStaticSettings } from "../hooks/useStaticSettings";
import RowBasedMenu from "../navigation/row_based_menu/RowBasedMenu";
import { useLutrisActions } from "../stores/lutrisStore";
import { useModalActions, useModalState } from "../stores/modalStore";
import { useSettingsState } from "../stores/settingsStore";
import { useToastActions } from "../stores/toastStore";
import { useTranslation } from "../stores/translationStore";
import { useUI } from "../stores/uiStore";
import * as api from "../utils/ipc";

import About from "./About";
import ConfirmationDialog from "./ConfirmationDialog";
import DisplaySettings from "./DisplaySettings";
import LegendaContainer from "./LegendaContainer";
import LutrisAddGameFlow from "./LutrisAddGameFlow";
import LutrisSettingsFlow from "./LutrisSettingsFlow";
import SettingsMenu from "./SettingsMenu";
import VolumeControl from "./VolumeControl";

import "../styles/SystemMenu.css";

const PowerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
    <line x1="12" y1="2" x2="12" y2="12"></line>
  </svg>
);

export const SystemMenuFocusId = "SystemMenu";

const SystemMenu = () => {
  const { t } = useTranslation();
  const { isSystemMenuOpen: isOpen, setSystemMenuOpen: setIsOpen } = useUI();
  const [focusedItem, setFocusedItem] = useState(null);
  const { showModal } = useModalActions();
  const { showToast } = useToastActions();
  const { isModalOpen } = useModalState();
  const { settings } = useSettingsState();
  const playActionSound = usePlayButtonActionSound();

  const menuReference = useRef(null);
  const menuPowerButtonReference = useRef(null);

  const { fetchGames } = useLutrisActions();

  const { staticSettings } = useStaticSettings();

  const openAudioSettingsModal = useCallback(() => {
    showModal((hideThisModal) => <VolumeControl onClose={hideThisModal} />);
    setIsOpen(false);
  }, [showModal, setIsOpen]);

  const openDisplaySettingsModal = useCallback(() => {
    showModal((hideThisModal) => <DisplaySettings onClose={hideThisModal} />);
    setIsOpen(false);
  }, [showModal, setIsOpen]);

  const openAboutModal = useCallback(() => {
    showModal((hideThisModal) => <About onClose={hideThisModal} />);
    setIsOpen(false);
  }, [showModal, setIsOpen]);

  const reloadLibraryAction = useCallback(async () => {
    showToast({
      title: t("Reloading library..."),
      type: "info",
    });
    await fetchGames();
  }, [fetchGames, showToast, t]);

  const syncLutrisAccountAction = useCallback(async () => {
    showToast({
      title: t("Syncing Lutris account..."),
      type: "info",
    });
    void api.syncLutrisAccount().then((result) => {
      if (result?.status === "success") {
        showToast({
          title: t("Lutris account synced"),
          type: "info",
        });
        reloadLibraryAction();
      } else if (result?.status === "not_connected") {
        showToast({
          title: t("No Lutris account connected"),
          description: t("Sign in to Lutris.net from the Lutris app first."),
          type: "error",
        });
      }
    });
  }, [showToast, t, reloadLibraryAction]);

  const openSettingsModal = useCallback(() => {
    showModal((hideThisModal) => <SettingsMenu onClose={hideThisModal} />);
    setIsOpen(false);
  }, [showModal, setIsOpen]);

  const openLutrisSettingsModal = useCallback(() => {
    showModal((hideThisModal) => (
      <LutrisSettingsFlow onClose={hideThisModal} />
    ));
    setIsOpen(false);
  }, [showModal, setIsOpen]);

  const openLutrisAddGameModal = useCallback(() => {
    showModal((hideThisModal) => (
      <LutrisAddGameFlow onClose={hideThisModal} onSaved={fetchGames} />
    ));
    setIsOpen(false);
  }, [fetchGames, showModal, setIsOpen]);

  const menuItems = useMemo(
    () =>
      [
        { label: t("Reload Library"), action: reloadLibraryAction },
        {
          label: t("About"),
          action: openAboutModal,
        },
        {
          label: t("Settings"),
          action: openSettingsModal,
        },
        {
          label: t("Lutris Settings"),
          action: openLutrisSettingsModal,
          disabled: staticSettings.DISABLE_LUTRIS_SETTINGS,
        },
        {
          label: t("Add Game"),
          action: openLutrisAddGameModal,
          disabled: staticSettings.DISABLE_LUTRIS_SETTINGS,
        },
        {
          label: t("Sync Lutris Account"),
          action: syncLutrisAccountAction,
          disabled: staticSettings.DISABLE_SYNC_ACCOUNT,
        },
        {
          label: t("Audio Settings"),
          action: openAudioSettingsModal,
          disabled: staticSettings.DISABLE_AUDIO_SETTINGS,
        },
        {
          label: t("Display Settings"),
          action: openDisplaySettingsModal,
          disabled: staticSettings.DISABLE_DISPLAY_SETTINGS,
        },
        {
          label: t("Open Lutris"),
          action: () => api.openLutris(),
          disabled: staticSettings.DISABLE_OPEN_LUTRIS,
        },
        {
          label: t("Reboot System"),
          action: () => api.rebootPC(),
          doubleConfirm: settings.doubleConfirmPowerManagement,
          firstConfirm: t("Are you sure you want to reboot the system?"),
          secondConfirm: t("Continue with system reboot?"),
          disabled: staticSettings.DISABLE_REBOOT_SYSTEM,
        },
        {
          label: t("Power Off System"),
          action: () => api.powerOffPC(),
          doubleConfirm: settings.doubleConfirmPowerManagement,
          firstConfirm: t("Are you sure you want to power off the system?"),
          secondConfirm: t("Continue with system power off?"),
          disabled: staticSettings.DISABLE_POWER_OFF_SYSTEM,
        },
        {
          label: t("Suspend System"),
          action: () => api.suspendPC(),
          doubleConfirm: settings.doubleConfirmPowerManagement,
          firstConfirm: t("Are you sure you want to suspend the system?"),
          secondConfirm: t("Continue with suspend system?"),
          disabled:
            settings.systemPowerSuspendMode === "none" ||
            staticSettings.DISABLE_SUSPEND_SYSTEM,
        },
        {
          label: t("Generate Bug Report"),
          action: () => api.createBugReportFile(),
          firstConfirm: t(
            "Are you sure you want to generate the bug report file?",
          ),
          disabled: staticSettings.DISABLE_BUG_REPORT,
        },
        {
          label: t("Exit Application"),
          action: () => window.close(),
          doubleConfirm: true,
          firstConfirm: t("Are you sure you want to exit the application?"),
          secondConfirm: t("Continue with exiting the application?"),
        },
      ].filter((item) => !item.disabled),
    [
      t,
      reloadLibraryAction,
      openAboutModal,
      openSettingsModal,
      openLutrisSettingsModal,
      staticSettings.DISABLE_LUTRIS_SETTINGS,
      staticSettings.DISABLE_SYNC_ACCOUNT,
      staticSettings.DISABLE_AUDIO_SETTINGS,
      staticSettings.DISABLE_DISPLAY_SETTINGS,
      staticSettings.DISABLE_OPEN_LUTRIS,
      staticSettings.DISABLE_REBOOT_SYSTEM,
      staticSettings.DISABLE_POWER_OFF_SYSTEM,
      staticSettings.DISABLE_BUG_REPORT,
      staticSettings.DISABLE_SUSPEND_SYSTEM,
      openLutrisAddGameModal,
      syncLutrisAccountAction,
      openAudioSettingsModal,
      openDisplaySettingsModal,
      settings.doubleConfirmPowerManagement,
      settings.systemPowerSuspendMode,
    ],
  );

  const openConfirmation = useCallback(
    ({ title, description }, onConfirmAction) => {
      showModal((hideThisModal) => (
        <ConfirmationDialog
          message={title}
          description={description}
          onConfirm={() => {
            hideThisModal();
            onConfirmAction();
          }}
          onDeny={hideThisModal}
        />
      ));
    },
    [showModal],
  );

  const handleAction = useCallback(
    (item) => {
      setIsOpen(false);

      if (item.doubleConfirm) {
        const secondConfirmAction = () => {
          openConfirmation(
            {
              title: item.secondConfirm,
              description: t("This action is final and cannot be undone."),
            },
            item.action,
          );
        };

        openConfirmation({ title: item.firstConfirm }, secondConfirmAction);
      } else if (item.firstConfirm) {
        openConfirmation({ title: item.firstConfirm }, item.action);
      } else {
        item.action();
      }
    },
    [openConfirmation, t, setIsOpen],
  );

  useEffect(() => {
    if (isOpen) {
      menuPowerButtonReference.current?.focus();
    } else {
      menuPowerButtonReference.current?.blur();
    }
  }, [isOpen]);

  const toggleMenu = useCallback(() => {
    setIsOpen((previous) => {
      const isOpening = !previous;
      return isOpening;
    });
  }, [setIsOpen]);

  const handleMenuAction = useCallback(
    (actionName, item) => {
      if (actionName === "A") {
        if (item) handleAction(item);
      } else if (actionName === "B") {
        setIsOpen(false);
      }
    },
    [handleAction, setIsOpen],
  );

  useGlobalShortcut([
    {
      key: "Y",
      action: useCallback(() => {
        playActionSound();
        toggleMenu();
      }, [playActionSound, toggleMenu]),
      active: !isModalOpen,
    },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        menuReference.current &&
        !menuReference.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const closeMenuCallback = useCallback(() => setIsOpen(false), [setIsOpen]);

  const handleSelect = useCallback(() => {
    if (focusedItem) {
      handleAction(focusedItem);
    }
  }, [focusedItem, handleAction]);

  const legendItems = useMemo(
    () => [
      { button: "A", label: t("Select"), onClick: handleSelect },
      { button: "B", label: t("Back"), onClick: closeMenuCallback },
    ],
    [handleSelect, closeMenuCallback, t],
  );

  const renderMenuItem = useCallback(
    (item, isFocused, onMouseEnter, ref) => (
      <div
        ref={ref}
        className={`system-menu-item ${isFocused ? "focused" : ""}`}
        onClick={() => handleAction(item)}
        onMouseEnter={onMouseEnter}
      >
        {item.label}
      </div>
    ),
    [handleAction],
  );

  return (
    <div className="system-menu-container" ref={menuReference}>
      <button
        ref={menuPowerButtonReference}
        className="system-menu-toggle"
        onClick={toggleMenu}
        aria-label="Open System Menu"
      >
        <PowerIcon />
      </button>

      {isOpen && (
        <div className="system-menu-overlay">
          <LegendaContainer legendItems={legendItems} scrollable={false}>
            <RowBasedMenu
              items={menuItems}
              renderItem={renderMenuItem}
              onAction={handleMenuAction}
              onFocusChange={setFocusedItem}
              onFocusLost={closeMenuCallback}
              focusId={SystemMenuFocusId}
              isActive={isOpen}
            />
          </LegendaContainer>
        </div>
      )}
    </div>
  );
};

export default SystemMenu;
