import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { useScopedInput } from "../hooks/useScopedInput";
import "../styles/CrashDialog.css";
import { playActionSound } from "../utils/sound";
import { applyReplacements } from "../utils/string";
import LegendaContainer from "./LegendaContainer";

const SCROLL_AMOUNT = 50;

const CrashDialog = ({ error, errorInfo }) => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(0);
  const containerRef = useRef(null);
  const translationContext = useTranslation();

  const t = useCallback(
    (key, replacements, filename) => {
      if (translationContext && translationContext.t) {
        return translationContext.t(key, replacements, filename);
      }
      return applyReplacements(key, replacements);
    },
    [translationContext]
  );

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleClose = useCallback(() => {
    window.close();
  }, []);

  const toggleDetails = useCallback(() => {
    setDetailsVisible((prev) => !prev);
  }, []);

  const buttons = useMemo(
    () => [
      { label: t("Reload Application"), action: handleReload },
      { label: t("Close Application"), action: handleClose },
      {
        label: detailsVisible
          ? t("Hide Error Details")
          : t("Show Error Details"),
        action: toggleDetails,
      },
    ],
    [detailsVisible, handleReload, handleClose, toggleDetails, t]
  );

  const selectedButtonAction = useCallback(() => {
    if (buttons[focusedButtonIndex]) {
      buttons[focusedButtonIndex].action();
    }
  }, [buttons, focusedButtonIndex]);

  const handleScroll = useCallback((direction) => {
    const scrollable = containerRef.current?.querySelector(".legenda-content");
    if (scrollable) {
      scrollable.scrollTop += SCROLL_AMOUNT * (direction === "down" ? 1 : -1);
    }
  }, []);

  const inputHandler = useCallback(
    (input) => {
      playActionSound();
      switch (input.name) {
        case "UP":
          if (detailsVisible) handleScroll("up");
          break;
        case "DOWN":
          if (detailsVisible) handleScroll("down");
          break;
        case "LEFT":
          setFocusedButtonIndex((prev) => Math.max(0, prev - 1));
          break;
        case "RIGHT":
          setFocusedButtonIndex((prev) =>
            Math.min(buttons.length - 1, prev + 1)
          );
          break;
        case "A":
          selectedButtonAction();
          break;
      }
    },
    [buttons.length, selectedButtonAction, detailsVisible, handleScroll]
  );

  useScopedInput(inputHandler, "CrashDialogFocus");

  const legendItems = useMemo(() => {
    const items = [];
    if (detailsVisible) {
      items.push({
        button: "UP",
        label: t("Scroll Up"),
        onClick: () => handleScroll("up"),
      });
      items.push({
        button: "DOWN",
        label: t("Scroll Down"),
        onClick: () => handleScroll("down"),
      });
    }
    items.push(
      { button: "LEFT", label: t("Navigate") },
      { button: "RIGHT", label: t("Navigate") },
      { button: "A", label: t("Select"), onClick: selectedButtonAction }
    );
    return items;
  }, [selectedButtonAction, detailsVisible, handleScroll, t]);

  const errorString = error
    ? error.toString()
    : t("No error message provided.");

  const componentStackString =
    errorInfo && errorInfo.componentStack
      ? errorInfo.componentStack.toString()
      : t("No component stack available.");

  return (
    <div className="crash-dialog-overlay">
      <div className="crash-dialog-container" ref={containerRef}>
        <LegendaContainer legendItems={legendItems}>
          <div className="crash-dialog-content">
            <h1 className="crash-dialog-title">
              {t("Oops! Something went wrong.")}
            </h1>
            <p className="crash-dialog-message">
              {t("The application has encountered an unexpected error.")}
            </p>
            <div className="crash-dialog-actions">
              {buttons.map((button, index) => (
                <button
                  key={button.label}
                  onClick={button.action}
                  className={`crash-dialog-button ${
                    index === focusedButtonIndex ? "focused" : ""
                  }`}
                  onMouseEnter={() => setFocusedButtonIndex(index)}
                >
                  {button.label}
                </button>
              ))}
            </div>
            {detailsVisible && (
              <div className="crash-dialog-details">
                <pre>
                  <code>
                    {errorString}
                    {componentStackString}
                  </code>
                </pre>
              </div>
            )}
          </div>
        </LegendaContainer>
      </div>
    </div>
  );
};

export default CrashDialog;
