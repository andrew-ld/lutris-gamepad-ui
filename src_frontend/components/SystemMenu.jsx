import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLutrisActions } from "../contexts/LutrisContext";
import { useModalActions, useModalState } from "../contexts/ModalContext";
import { useSettingsState } from "../contexts/SettingsContext";
import { useToastActions } from "../contexts/ToastContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useUI } from "../contexts/UIContext";
import { useGlobalShortcut } from "../hooks/useGlobalShortcut";
import { usePlayButtonActionSound } from "../hooks/usePlayButtonActionSound";
import { useStaticSettings } from "../hooks/useStaticSettings";
import * as api from "../utils/ipc";

import About from "./About";
import BluetoothMenu from "./BluetoothMenu";
import ConfirmationDialog from "./ConfirmationDialog";
import DisplaySettings from "./DisplaySettings";
import LegendaContainer from "./LegendaContainer";
import LutrisSettingsFlow from "./LutrisSettingsFlow";
import RowBasedMenu from "./RowBasedMenu";
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

  const openBluetoothSettingsModal = useCallback(() => {
    showModal((hideThisModal) => <BluetoothMenu onClose={hideThisModal} />);
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
          label: t("Bluetooth Settings"),
          action: openBluetoothSettingsModal,
          disabled: staticSettings.DISABLE_BLUETOOTH_SETTINGS,
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
      openAudioSettingsModal,
      openDisplaySettingsModal,
      openBluetoothSettingsModal,
      settings.doubleConfirmPowerManagement,
      staticSettings.DISABLE_LUTRIS_SETTINGS,
      staticSettings.DISABLE_AUDIO_SETTINGS,
      staticSettings.DISABLE_DISPLAY_SETTINGS,
      staticSettings.DISABLE_BLUETOOTH_SETTINGS,
      staticSettings.DISABLE_OPEN_LUTRIS,
      staticSettings.DISABLE_REBOOT_SYSTEM,
      staticSettings.DISABLE_POWER_OFF_SYSTEM,
      staticSettings.DISABLE_BUG_REPORT,
    ],
  );

  const openConfirmation = useCallback(
    ({ title, description }, onConfirmAction, closeOnConfirm = true) => {
      showModal((hideThisModal) => (
        <ConfirmationDialog
          message={title}
          description={description}
          onConfirm={() => {
            onConfirmAction();
            if (closeOnConfirm) {
              hideThisModal();
            }
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

        openConfirmation(
          { title: item.firstConfirm },
          secondConfirmAction,
          false,
        );
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
    (item, isFocused, onMouseEnter) => (
      <div
        key={item.label}
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
          <LegendaContainer legendItems={legendItems}>
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
