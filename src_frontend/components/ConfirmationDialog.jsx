import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useScopedInput } from "../hooks/useScopedInput";
import "../styles/ConfirmationDialog.css";
import { playActionSound } from "../utils/sound";
import LegendaContainer from "./LegendaContainer";
import { useTranslation } from "../contexts/TranslationContext";

export const ConfirmationDialogFocusId = "ConfirmationDialog";

const ConfirmationDialog = ({ message, description, onConfirm, onDeny }) => {
  const { t } = useTranslation();
  const [confirmSelection, setConfirmSelection] = useState(0);

  const confirmSelectionRef = useRef(confirmSelection);

  useEffect(() => {
    confirmSelectionRef.current = confirmSelection;
  }, [confirmSelection]);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleDeny = useCallback(() => {
    onDeny();
  }, [onDeny]);

  const handleSubmit = useCallback(() => {
    if (confirmSelectionRef.current === 0) {
      handleConfirm();
    } else {
      handleDeny();
    }
  }, [handleConfirm, handleDeny]);

  const inputHandler = useCallback(
    (input) => {
      playActionSound();

      switch (input.name) {
        case "UP":
        case "DOWN":
          setConfirmSelection((prev) => (prev === 0 ? 1 : 0));
          break;
        case "A":
          handleSubmit();
          break;
        case "B":
          handleDeny();
          break;
      }
    },
    [handleDeny, handleSubmit]
  );

  useScopedInput(inputHandler, ConfirmationDialogFocusId);

  const legendItems = useMemo(
    () => [
      { button: "A", label: t("Select"), onClick: handleSubmit },
      { button: "B", label: t("Cancel"), onClick: handleDeny },
    ],
    [handleSubmit, handleDeny, t]
  );

  return (
    <div className="confirmation-dialog">
      <LegendaContainer legendItems={legendItems}>
        <div className="confirmation-content">
          <h3 className="confirmation-title">{message}</h3>
          {description && (
            <p className="confirmation-description">{description}</p>
          )}
          <div className="confirmation-buttons">
            <button
              className={`confirmation-button ${
                confirmSelection === 0 ? "focused" : ""
              }`}
              onClick={handleConfirm}
            >
              {t("Confirm")}
            </button>
            <button
              className={`confirmation-button ${
                confirmSelection === 1 ? "focused" : ""
              }`}
              onClick={handleDeny}
            >
              {t("Cancel")}
            </button>
          </div>
        </div>
      </LegendaContainer>
    </div>
  );
};

export default ConfirmationDialog;
