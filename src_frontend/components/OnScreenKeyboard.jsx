import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useScopedInput } from "../hooks/useScopedInput";
import "../styles/OnScreenKeyboard.css";
import { playActionSound } from "../utils/sound";
import LegendaContainer from "./LegendaContainer";
import { useTranslation } from "../contexts/TranslationContext";

export const OnScreenKeyboardFocusID = "OnScreenKeyboard";

const OnScreenKeyboard = ({ initialValue, onConfirm, onClose, label }) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(initialValue || "");
  const [focusCoords, setFocusCoords] = useState({ x: 0, y: 0 });

  const inputValueRef = useRef(inputValue);
  const focusCoordsRef = useRef(focusCoords);
  const onConfirmRef = useRef(onConfirm);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    focusCoordsRef.current = focusCoords;
  }, [focusCoords]);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const keyLayout = useMemo(
    () => [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      [
        "z",
        "x",
        "c",
        "v",
        "b",
        "n",
        "m",
        { id: "Backspace", label: t("Backspace") },
      ],
      [
        { id: "Close", label: t("Close") },
        { id: "Space", label: t("Space") },
        { id: "Enter", label: t("Enter") },
      ],
    ],
    [t]
  );

  const handleKeyPress = useCallback((keyId) => {
    if (typeof keyId !== "string") return;

    switch (keyId) {
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
        setInputValue((prev) => prev + keyId);
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

            if (input.name === "UP") y = Math.max(0, y - 1);
            if (input.name === "DOWN")
              y = Math.min(keyLayout.length - 1, y + 1);

            const targetRowLength = keyLayout[y].length;
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
          const keyObject =
            keyLayout[focusCoordsRef.current.y][focusCoordsRef.current.x];
          const keyId =
            typeof keyObject === "string" ? keyObject : keyObject.id;
          handleKeyPress(keyId);
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
    [handleKeyPress, keyLayout]
  );

  useScopedInput(inputHandler, OnScreenKeyboardFocusID);

  const onSelectCallback = useCallback(() => {
    const keyObject =
      keyLayout[focusCoordsRef.current.y][focusCoordsRef.current.x];
    const keyId = typeof keyObject === "string" ? keyObject : keyObject.id;
    handleKeyPress(keyId);
  }, [handleKeyPress, keyLayout]);

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
        label: t("Select"),
        onClick: onSelectCallback,
      },
      {
        button: "X",
        label: t("Submit"),
        onClick: onConfirmCallback,
      },
      { button: "B", label: t("Close"), onClick: onCloseCallback },
    ],
    [onSelectCallback, onConfirmCallback, onCloseCallback, t]
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
            {keyLayout.map((row, y) => (
              <div className="osk-row" key={`row-${y}`}>
                {row.map((keyObject, x) => {
                  const isFocused = focusCoords.x === x && focusCoords.y === y;
                  const isSpecial = typeof keyObject !== "string";
                  const keyLabel = isSpecial ? keyObject.label : keyObject;
                  const keyId = isSpecial ? keyObject.id : keyObject;
                  return (
                    <button
                      key={keyId}
                      className={`osk-key ${isSpecial ? "special" : ""} ${
                        isFocused ? "focused" : ""
                      }`}
                      onClick={() => handleKeyPress(keyId)}
                    >
                      {keyLabel}
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
