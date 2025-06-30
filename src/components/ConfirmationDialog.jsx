import { useState, useCallback, useMemo, useRef } from "react";
import { useScopedInput } from "../hooks/useScopedInput";
import "../styles/ConfirmationDialog.css";
import { playActionSound } from "../utils/sound";
import LegendaContainer from "./LegendaContainer";

export const ConfirmationDialogFocusId = "ConfirmationDialog";

const ConfirmationDialog = ({ message, onConfirm, onDeny }) => {
  const [confirmSelection, setConfirmSelection] = useState(0);

  const confirmSelectionRef = useRef(confirmSelection);
  confirmSelectionRef.current = confirmSelection;

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
      { button: "A", label: "Select", onClick: handleSubmit },
      { button: "B", label: "Cancel", onClick: handleDeny },
    ],
    [handleSubmit, handleDeny]
  );

  return (
    <div className="confirmation-dialog">
      <LegendaContainer legendItems={legendItems}>
        <div className="confirmation-content">
          <p className="confirmation-message">{message}</p>
          <div className="confirmation-buttons">
            <button
              className={`confirmation-button ${
                confirmSelection === 0 ? "focused" : ""
              }`}
              onClick={handleConfirm}
            >
              Confirm
            </button>
            <button
              className={`confirmation-button ${
                confirmSelection === 1 ? "focused" : ""
              }`}
              onClick={handleDeny}
            >
              Cancel
            </button>
          </div>
        </div>
      </LegendaContainer>
    </div>
  );
};

export default ConfirmationDialog;
