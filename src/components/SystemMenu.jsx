import { useState, useEffect, useRef, useCallback, act } from "react";
import { useInput } from "../contexts/InputContext";
import { useModal } from "../contexts/ModalContext";
import ConfirmationDialog from "./ConfirmationDialog";
import VolumeControl from "./VolumeControl";
import * as api from "../utils/ipc";
import { useLutris } from "../contexts/LutrisContext";
import "../styles/SystemMenu.css";
import { playActionSound } from "../utils/sound";
import LegendaContainer from "./LegendaContainer";

const PowerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { showModal, isModalOpen } = useModal();

  const { lastInput, claimInputFocus, releaseInputFocus, isFocused } =
    useInput();
  const menuRef = useRef(null);
  const menuPowerButtonRef = useRef(null);
  const lastProcessedInput = useRef(null);

  const { fetchGames } = useLutris();

  const openAudioSettingsModal = useCallback(() => {
    showModal((hideThisModal) => <VolumeControl onClose={hideThisModal} />);
    setIsOpen(false);
  }, [showModal]);

  const menuItems = [
    { label: "Reload Library", action: fetchGames },
    {
      label: "Audio Settings",
      action: openAudioSettingsModal,
    },
    { label: "Open Lutris", action: () => api.openLutris() },
    {
      label: "Reboot System",
      action: () => api.rebootPC(),
      doubleConfirm: true,
    },
    {
      label: "Power Off System",
      action: () => api.powerOffPC(),
      doubleConfirm: true,
    },
    { label: "Exit Application", action: () => window.close(), confirm: true },
  ];

  const openConfirmation = useCallback(
    (message, onConfirmAction, closeOnConfirm = true) => {
      showModal((hideThisModal) => (
        <ConfirmationDialog
          message={message}
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

      if (item.doubleConfirm || item.confirm) {
        let action;

        if (item.confirm) {
          action = item.action;
        } else {
          action = () => {
            openConfirmation(
              `This action is final and cannot be undone.\nContinue with "${item.label}"?`,
              item.action
            );
          };
        }

        openConfirmation(
          `Are you sure you want to\n${item.label}?`,
          action,
          !!item.confirm
        );
      } else {
        item.action();
      }
    },
    [openConfirmation]
  );

  useEffect(() => {
    if (isOpen && menuPowerButtonRef.current) {
      menuPowerButtonRef.current.focus();
    }
  }, [isOpen]);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => {
      const isOpening = !prev;
      if (isOpening) {
        setSelectedIndex(0);
      }
      return isOpening;
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      claimInputFocus(SystemMenuFocusId);
    } else {
      releaseInputFocus(SystemMenuFocusId);
    }
  }, [isOpen, claimInputFocus, releaseInputFocus]);

  useEffect(() => {
    window.addEventListener("toggle-system-menu", toggleMenu);
    return () => window.removeEventListener("toggle-system-menu", toggleMenu);
  }, [toggleMenu]);

  const handleSelect = useCallback(() => {
    handleAction(menuItems[selectedIndex]);
  }, [handleAction, menuItems, selectedIndex]);

  useEffect(() => {
    if (!lastInput || lastInput.timestamp === lastProcessedInput.current) {
      return;
    }

    if (lastInput.name === "Y" && !isModalOpen) {
      playActionSound();
      lastProcessedInput.current = lastInput.timestamp;
      toggleMenu();
      return;
    }

    if (!isOpen || !isFocused(SystemMenuFocusId)) return;

    lastProcessedInput.current = lastInput.timestamp;

    switch (lastInput.name) {
      case "UP":
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          if (next !== prev) playActionSound();
          return next;
        });
        break;
      case "DOWN":
        setSelectedIndex((prev) => {
          const next = Math.min(menuItems.length - 1, prev + 1);
          if (next !== prev) playActionSound();
          return next;
        });
        break;
      case "A":
        playActionSound();
        handleSelect();
        break;
      case "B":
        playActionSound();
        setIsOpen(false);
        break;
    }
  }, [
    lastInput,
    isOpen,
    selectedIndex,
    toggleMenu,
    isFocused,
    handleAction,
    isModalOpen,
    handleSelect,
  ]);

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

  const legendItems = [
    { button: "A", label: "Select", onClick: handleSelect },
    { button: "B", label: "Back", onClick: () => setIsOpen(false) },
  ];

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
            <ul className="system-menu-list">
              {menuItems.map((item, index) => (
                <li
                  key={item.label}
                  className={`system-menu-item ${
                    index === selectedIndex ? "focused" : ""
                  }`}
                  onClick={() => handleAction(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          </LegendaContainer>
        </div>
      )}
    </div>
  );
};

export default SystemMenu;
