import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useModalActions, useModalState } from "../contexts/ModalContext";
import ConfirmationDialog from "./ConfirmationDialog";
import VolumeControl from "./VolumeControl";
import * as api from "../utils/ipc";
import { useLutris } from "../contexts/LutrisContext";
import "../styles/SystemMenu.css";
import { playActionSound } from "../utils/sound";
import LegendaContainer from "./LegendaContainer";
import BluetoothMenu from "./BluetoothMenu";
import { useGlobalShortcut } from "../hooks/useGlobalShortcut";
import About from "./About";
import RowBasedMenu from "./RowBasedMenu";
import { useTranslation } from "../contexts/TranslationContext";
import { useToastActions } from "../contexts/ToastContext";

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
  const [isOpen, setIsOpen] = useState(false);
  const [focusedItem, setFocusedItem] = useState(null);
  const { showModal } = useModalActions();
  const { showToast } = useToastActions();
  const { isModalOpen } = useModalState();

  const menuRef = useRef(null);
  const menuPowerButtonRef = useRef(null);

  const { fetchGames } = useLutris();

  const openAudioSettingsModal = useCallback(() => {
    showModal((hideThisModal) => <VolumeControl onClose={hideThisModal} />);
    setIsOpen(false);
  }, [showModal]);

  const openBluetoothSettingsModal = useCallback(() => {
    showModal((hideThisModal) => <BluetoothMenu onClose={hideThisModal} />);
    setIsOpen(false);
  }, [showModal]);

  const openAboutModal = useCallback(() => {
    showModal((hideThisModal) => <About onClose={hideThisModal} />);
    setIsOpen(false);
  }, [showModal]);

  const reloadLibraryAction = useCallback(async () => {
    showToast({
      title: t("Reloading library..."),
      type: "info",
    });
    await fetchGames();
  }, [fetchGames, showToast, t]);

  const menuItems = useMemo(
    () => [
      { label: t("Reload Library"), action: reloadLibraryAction },
      {
        label: t("About"),
        action: openAboutModal,
      },
      {
        label: t("Audio Settings"),
        action: openAudioSettingsModal,
      },
      {
        label: t("Bluetooth Settings"),
        action: openBluetoothSettingsModal,
      },
      { label: t("Open Lutris"), action: () => api.openLutris() },
      {
        label: t("Reboot System"),
        action: () => api.rebootPC(),
        doubleConfirm: true,
        firstConfirm: t("Are you sure you want to reboot the system?"),
        secondConfirm: t("Continue with system reboot?"),
      },
      {
        label: t("Power Off System"),
        action: () => api.powerOffPC(),
        doubleConfirm: true,
        firstConfirm: t("Are you sure you want to power off the system?"),
        secondConfirm: t("Continue with system power off?"),
      },
      {
        label: t("Exit Application"),
        action: () => window.close(),
        doubleConfirm: true,
        firstConfirm: t("Are you sure you want to exit the application?"),
        secondConfirm: t("Continue with exiting the application?"),
      },
    ],
    [
      reloadLibraryAction,
      openAudioSettingsModal,
      openAboutModal,
      openBluetoothSettingsModal,
      t,
    ]
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
    [showModal]
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
            item.action
          );
        };

        openConfirmation(
          { title: item.firstConfirm },
          secondConfirmAction,
          false
        );
      } else {
        item.action();
      }
    },
    [openConfirmation, t]
  );

  useEffect(() => {
    if (isOpen) {
      menuPowerButtonRef.current?.focus();
    } else {
      menuPowerButtonRef.current?.blur();
    }
  }, [isOpen]);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => {
      const isOpening = !prev;
      return isOpening;
    });
  }, []);

  const handleMenuAction = useCallback(
    (actionName, item) => {
      if (actionName === "A") {
        if (item) handleAction(item);
      } else if (actionName === "B") {
        setIsOpen(false);
      }
    },
    [handleAction]
  );

  useGlobalShortcut([
    {
      key: "Y",
      action: () => {
        playActionSound();
        toggleMenu();
      },
      active: !isModalOpen,
    },
  ]);

  useEffect(() => {
    window.addEventListener("toggle-system-menu", toggleMenu);
    return () => window.removeEventListener("toggle-system-menu", toggleMenu);
  }, [toggleMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const closeMenuCallback = useCallback(() => setIsOpen(false), []);

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
    [handleSelect, closeMenuCallback, t]
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
    [handleAction]
  );

  return (
    <div className="system-menu-container" ref={menuRef}>
      <button
        ref={menuPowerButtonRef}
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
