import { useState, useCallback, useRef, useMemo } from "react";
import { useScopedInput } from "../hooks/useScopedInput";
import "../styles/OnScreenKeyboard.css";
import { playActionSound } from "../utils/sound";
import LegendaContainer from "./LegendaContainer";

export const OnScreenKeyboardFocusID = "OnScreenKeyboard";

const KEY_LAYOUT = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", "Backspace"],
  ["Close", "Space", "Enter"],
];

const OnScreenKeyboard = ({ initialValue, onConfirm, onClose, label }) => {
  const [inputValue, setInputValue] = useState(initialValue || "");
  const [focusCoords, setFocusCoords] = useState({ x: 0, y: 0 });

  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;

  const focusCoordsRef = useRef(focusCoords);
  focusCoordsRef.current = focusCoords;

  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleKeyPress = useCallback((key) => {
    if (typeof key !== "string") return;

    switch (key) {
      case "Backspace":
        setInputValue((prev) => prev.slice(0, -1));
        break;
      case "Space":
        setInputValue((prev) => prev + " ");
        break;
      case "Enter":
        onConfirmRef.current(inputValueRef.current);
        break;
      case "Close":
        onCloseRef.current();
        break;
      default:
        setInputValue((prev) => prev + key);
        break;
    }
  }, []);

  const inputHandler = useCallback(
    (input) => {
      switch (input.name) {
        case "UP":
        case "DOWN":
        case "LEFT":
        case "RIGHT":
          setFocusCoords((prev) => {
            const originalCoords = { ...prev };
            let { x, y } = prev;
            const currentLayout = KEY_LAYOUT;

            if (input.name === "UP") y = Math.max(0, y - 1);
            if (input.name === "DOWN")
              y = Math.min(currentLayout.length - 1, y + 1);

            const targetRowLength = currentLayout[y].length;
            x = Math.min(x, targetRowLength - 1);

            if (input.name === "LEFT") x = Math.max(0, x - 1);
            if (input.name === "RIGHT")
              x = Math.min(targetRowLength - 1, x + 1);

            if (originalCoords.x !== x || originalCoords.y !== y) {
              playActionSound();
            }

            return { x, y };
          });
          break;
        case "A":
          playActionSound();
          handleKeyPress(
            KEY_LAYOUT[focusCoordsRef.current.y][focusCoordsRef.current.x]
          );
          break;
        case "X":
          playActionSound();
          onConfirmRef.current(inputValueRef.current);
          break;
        case "B":
          playActionSound();
          onCloseRef.current();
          break;
      }
    },
    [handleKeyPress]
  );

  useScopedInput(inputHandler, OnScreenKeyboardFocusID);

  const onSelectCallback = useCallback(() => {
    handleKeyPress(
      KEY_LAYOUT[focusCoordsRef.current.y][focusCoordsRef.current.x]
    );
  }, [handleKeyPress]);

  const onConfirmCallback = useCallback(() => {
    onConfirmRef.current(inputValueRef.current);
  }, []);

  const onCloseCallback = useCallback(() => {
    onCloseRef.current();
  }, []);

  const legendItems = useMemo(
    () => [
      {
        button: "A",
        label: "Select",
        onClick: onSelectCallback,
      },
      {
        button: "X",
        label: "Submit",
        onClick: onConfirmCallback,
      },
      { button: "B", label: "Close", onClick: onCloseCallback },
    ],
    [onSelectCallback, onConfirmCallback, onCloseCallback]
  );

  return (
    <div className="osk-container" tabIndex="-1">
      <LegendaContainer legendItems={legendItems}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="osk-input-display">
            <label className="osk-label">{label}</label>
            <div className="osk-input-wrapper">
              <span className="osk-input-value">{inputValue}</span>
              <span className="osk-cursor" />
            </div>
          </div>
          <div className="osk-layout">
            {KEY_LAYOUT.map((row, y) => (
              <div className="osk-row" key={`row-${y}`}>
                {row.map((key, x) => {
                  const isFocused = focusCoords.x === x && focusCoords.y === y;
                  return (
                    <button
                      key={key}
                      className={`osk-key ${key.length > 1 ? "special" : ""} ${
                        isFocused ? "focused" : ""
                      }`}
                      onClick={() => handleKeyPress(key)}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </LegendaContainer>
    </div>
  );
};

export default OnScreenKeyboard;
