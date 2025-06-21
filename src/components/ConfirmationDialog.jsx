import { useState, useEffect, useRef, useCallback } from "react";
import { useInput } from "../contexts/InputContext";
import ButtonIcon from "./ButtonIcon";
import "../styles/ConfirmationDialog.css";
import { playActionSound } from "../utils/sound";

export const ConfirmationDialogFocusId = "ConfirmationDialog";

const ConfirmationDialog = ({ message, onConfirm, onDeny }) => {
  const { lastInput, claimInputFocus, releaseInputFocus, isFocused } =
    useInput();
  const lastProcessedInput = useRef();
  const [confirmSelection, setConfirmSelection] = useState(0);

  useEffect(() => {
    claimInputFocus(ConfirmationDialogFocusId);
    return () => releaseInputFocus(ConfirmationDialogFocusId);
  }, [claimInputFocus, releaseInputFocus]);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleDeny = useCallback(() => {
    onDeny();
  }, [onDeny]);

  const handleSubmit = useCallback(() => {
    if (confirmSelection === 0) {
      handleConfirm();
    } else {
      handleDeny();
    }
  }, [handleConfirm, handleDeny, confirmSelection]);

  useEffect(() => {
    if (
      !isFocused(ConfirmationDialogFocusId) ||
      !lastInput ||
      lastInput.timestamp === lastProcessedInput.current
    ) {
      return;
    }
    lastProcessedInput.current = lastInput.timestamp;

    playActionSound();

    switch (lastInput.name) {
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
  }, [lastInput, isFocused, handleDeny, handleSubmit]);

  return (
    <div className="confirmation-dialog">
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
      <div className="confirmation-footer">
        <ButtonIcon
          button="A"
          label="Select"
          size="small"
          onClick={handleSubmit}
        />
        <ButtonIcon
          button="B"
          label="Cancel"
          size="small"
          onClick={handleDeny}
        />
      </div>
    </div>
  );
};

export default ConfirmationDialog;
