import { useState, useEffect, useRef, useCallback } from "react";
import { useInput } from "../contexts/InputContext";
import * as api from "../utils/ipc";
import "../styles/SystemMenu.css";

const menuItems = [
  { label: "Exit Application", action: () => window.close() },
  { label: "Reboot System", action: () => api.rebootPC() },
  { label: "Power Off System", action: () => api.powerOffPC() },
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

const Hint = ({ button, label }) => (
  <div className="system-menu-hint">
    <div className={`button-icon button-${button.toLowerCase()}`}>{button}</div>
    <span className="button-label">{label}</span>
  </div>
);

export const SystemMenuFocusId = "SystemMenu";

const SystemMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { lastInput, claimInputFocus, releaseInputFocus, isFocused } =
    useInput();
  const menuRef = useRef(null);
  const lastProcessedInput = useRef(null);

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

  useEffect(() => {
    if (!lastInput || lastInput.timestamp === lastProcessedInput.current) {
      return;
    }

    if (lastInput.name === "Y") {
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
        menuItems[selectedIndex].action();
        setIsOpen(false);
        break;
      case "B":
        setIsOpen(false);
        break;
    }
  }, [lastInput, isOpen, selectedIndex, toggleMenu, isFocused]);

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
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {item.label}
              </li>
            ))}
          </ul>
          <div className="system-menu-footer">
            <Hint button="A" label="Select" />
            <Hint button="B" label="Back" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemMenu;
