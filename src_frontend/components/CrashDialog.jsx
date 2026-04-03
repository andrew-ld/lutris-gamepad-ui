import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import { usePlayButtonActionSound } from "../hooks/usePlayButtonActionSound";
import { useScopedInput } from "../hooks/useScopedInput";
import { applyReplacements } from "../utils/string";

import DialogLayout from "./DialogLayout";

import "../styles/CrashDialog.css";

const SCROLL_AMOUNT = 50;

const CrashDialog = ({ error, errorInfo }) => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(0);
  const translationContext = useTranslation();
  const playActionSound = usePlayButtonActionSound();
  const [contentElement, setContentElement] = useState(null);

  const t = useCallback(
    (key, replacements, filename) => {
      if (translationContext && translationContext.t) {
        return translationContext.t(key, replacements, filename);
      }
      return applyReplacements(key, replacements);
    },
    [translationContext],
  );

  const handleReload = useCallback(() => {
    globalThis.location.reload();
  }, []);

  const handleClose = useCallback(() => {
    window.close();
  }, []);

  const toggleDetails = useCallback(() => {
    setDetailsVisible((previous) => !previous);
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
    [detailsVisible, handleReload, handleClose, toggleDetails, t],
  );

  const selectedButtonAction = useCallback(() => {
    if (buttons[focusedButtonIndex]) {
      buttons[focusedButtonIndex].action();
    }
  }, [buttons, focusedButtonIndex]);

  const handleScroll = useCallback(
    (direction) => {
      if (contentElement) {
        contentElement.scrollTo({
          top:
            contentElement.scrollTop +
            SCROLL_AMOUNT * (direction === "down" ? 1 : -1),
        });
      }
    },
    [contentElement],
  );

  const inputHandler = useCallback(
    (input) => {
      playActionSound();
      switch (input.name) {
        case "UP": {
          if (detailsVisible) handleScroll("up");
          break;
        }
        case "DOWN": {
          if (detailsVisible) handleScroll("down");
          break;
        }
        case "LEFT": {
          setFocusedButtonIndex((previous) => Math.max(0, previous - 1));
          break;
        }
        case "RIGHT": {
          setFocusedButtonIndex((previous) =>
            Math.min(buttons.length - 1, previous + 1),
          );
          break;
        }
        case "A": {
          selectedButtonAction();
          break;
        }
      }
    },
    [
      buttons.length,
      selectedButtonAction,
      detailsVisible,
      handleScroll,
      playActionSound,
    ],
  );

  useScopedInput(inputHandler, "CrashDialogFocus");

  const legendItems = useMemo(() => {
    const items = [];
    if (detailsVisible) {
      items.push(
        {
          button: "UP",
          label: t("Scroll Up"),
          onClick: () => handleScroll("up"),
        },
        {
          button: "DOWN",
          label: t("Scroll Down"),
          onClick: () => handleScroll("down"),
        },
      );
    }
    items.push(
      { button: "LEFT", label: t("Navigate") },
      { button: "RIGHT", label: t("Navigate") },
      { button: "A", label: t("Select"), onClick: selectedButtonAction },
    );
    return items;
  }, [detailsVisible, handleScroll, selectedButtonAction, t]);

  const errorString = error
    ? error.toString()
    : t("No error message provided.");

  const componentStackString =
    errorInfo && errorInfo.componentStack
      ? errorInfo.componentStack.toString()
      : t("No component stack available.");

  return (
    <div className="crash-dialog-overlay">
      <DialogLayout
        title={t("Oops! Something went wrong.")}
        description={t("The application has encountered an unexpected error.")}
        legendItems={legendItems}
        maxWidth="800px"
        className="crash-dialog-container"
        contentRef={setContentElement}
      >
        <div className="modal-buttons-row">
          {buttons.map((button, index) => (
            <button
              key={button.label}
              onClick={button.action}
              className={`modal-button ${
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
      </DialogLayout>
    </div>
  );
};

export default CrashDialog;
