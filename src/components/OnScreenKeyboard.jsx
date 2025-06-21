import { useState, useEffect, useRef, useCallback } from "react";
import { useInput } from "../contexts/InputContext";
import ButtonIcon from "./ButtonIcon";
import "../styles/OnScreenKeyboard.css";

export const OnScreenKeyboardFocusID = "OnScreenKeyboard";

const KEY_LAYOUT = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", "Backspace"],
  ["Close", "Space", "Enter"],
];

const OnScreenKeyboard = ({ initialValue, onConfirm, onClose, label }) => {
  const { lastInput, claimInputFocus, releaseInputFocus, isFocused } =
    useInput();
  const [inputValue, setInputValue] = useState(initialValue || "");
  const [focusCoords, setFocusCoords] = useState({ x: 0, y: 0 });
  const rootRef = useRef(null);
  const lastProcessedInput = useRef(null);

  useEffect(() => {
    claimInputFocus(OnScreenKeyboardFocusID);
    if (rootRef.current) {
      rootRef.current.focus();
    }
    return () => releaseInputFocus(OnScreenKeyboardFocusID);
  }, [claimInputFocus, releaseInputFocus]);

  const handleKeyPress = useCallback(
    (key) => {
      if (typeof key !== "string") return;

      switch (key) {
        case "Backspace":
          setInputValue((prev) => prev.slice(0, -1));
          break;
        case "Space":
          setInputValue((prev) => prev + " ");
          break;
        case "Enter":
          onConfirm(inputValue);
          break;
        case "Close":
          onClose();
          break;
        default:
          setInputValue((prev) => prev + key);
          break;
      }
    },
    [onConfirm, onClose, inputValue]
  );

  useEffect(() => {
    if (
      !isFocused(OnScreenKeyboardFocusID) ||
      !lastInput ||
      lastInput.timestamp === lastProcessedInput.current
    ) {
      return;
    }
    lastProcessedInput.current = lastInput.timestamp;

    switch (lastInput.name) {
      case "UP":
      case "DOWN":
      case "LEFT":
      case "RIGHT":
        setFocusCoords((prev) => {
          let { x, y } = prev;
          const currentLayout = KEY_LAYOUT;

          if (lastInput.name === "UP") y = Math.max(0, y - 1);
          if (lastInput.name === "DOWN")
            y = Math.min(currentLayout.length - 1, y + 1);

          const targetRowLength = currentLayout[y].length;
          x = Math.min(x, targetRowLength - 1);

          if (lastInput.name === "LEFT") x = Math.max(0, x - 1);
          if (lastInput.name === "RIGHT")
            x = Math.min(targetRowLength - 1, x + 1);

          return { x, y };
        });
        break;
      case "A":
        handleKeyPress(KEY_LAYOUT[focusCoords.y][focusCoords.x]);
        break;
      case "X":
        onConfirm(inputValue);
        break;
      case "B":
        onClose();
        break;
    }
  }, [
    lastInput,
    isFocused,
    focusCoords,
    handleKeyPress,
    onClose,
    inputValue,
    onConfirm,
  ]);

  const onSelectCallback = useCallback(() => {
    handleKeyPress(KEY_LAYOUT[focusCoords.y][focusCoords.x]);
  }, [handleKeyPress, focusCoords]);

  return (
    <div ref={rootRef} className="osk-container" tabIndex="-1">
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
      <div className="osk-footer">
        <ButtonIcon
          button="A"
          label="Select"
          size="small"
          onClick={onSelectCallback}
        />
        <ButtonIcon
          button="X"
          label="Submit"
          size="small"
          onClick={() => onConfirm(inputValue)}
        />
        <ButtonIcon button="B" label="Close" size="small" onClick={onClose} />
      </div>
    </div>
  );
};

export default OnScreenKeyboard;
