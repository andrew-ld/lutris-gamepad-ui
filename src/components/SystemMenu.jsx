import { useState, useEffect, useRef, useCallback } from "react";
import { useInput } from "../contexts/InputContext";
import { useModal } from "../contexts/ModalContext";
import ConfirmationDialog from "./ConfirmationDialog";
import ButtonIcon from "./ButtonIcon";
import * as api from "../utils/ipc";
import "../styles/SystemMenu.css";

const menuItems = [
  { label: "Exit Application", action: () => window.close(), confirm: true },
  { label: "Open Lutris", action: () => api.openLutris(), confirm: true },
  { label: "Reboot System", action: () => api.rebootPC(), confirm: true },
  { label: "Power Off System", action: () => api.powerOffPC(), confirm: true },
];

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
  const { showModal, modalContent } = useModal();

  const { lastInput, claimInputFocus, releaseInputFocus, isFocused } =
    useInput();
  const menuRef = useRef(null);
  const menuPowerButtonRef = useRef(null);
  const lastProcessedInput = useRef(null);

  useEffect(() => {
    if (isOpen && menuPowerButtonRef.current) {
      menuPowerButtonRef.current.focus();
    }
  }, [isOpen, menuPowerButtonRef]);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => {
      const isOpening = !prev;
      if (isOpening) {
        setSelectedIndex(0);
      }
      return isOpening;
    });
  }, []);

  const handleAction = useCallback(
    (item) => {
      if (item.confirm) {
        showModal(
          <ConfirmationDialog
            message={`Are you sure you want to\n${item.label}?`}
            onConfirm={() => {
              item.action();
              setIsOpen(false);
            }}
            onDeny={() => setIsOpen(false)}
          />
        );
      } else {
        item.action();
        setIsOpen(false);
      }
    },
    [showModal]
  );

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

  useEffect(() => {
    if (!lastInput || lastInput.timestamp === lastProcessedInput.current) {
      return;
    }

    if (lastInput.name === "Y" && !modalContent) {
      lastProcessedInput.current = lastInput.timestamp;
      toggleMenu();
      return;
    }

    if (!isOpen || !isFocused(SystemMenuFocusId)) return;

    lastProcessedInput.current = lastInput.timestamp;

    switch (lastInput.name) {
      case "UP":
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        break;
      case "DOWN":
        setSelectedIndex((prev) => Math.min(menuItems.length - 1, prev + 1));
        break;
      case "A":
        handleAction(menuItems[selectedIndex]);
        break;
      case "B":
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
    modalContent,
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
          <div className="system-menu-footer">
            <ButtonIcon button="A" label="Select" size="small" />
            <ButtonIcon button="B" label="Back" size="small" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemMenu;
