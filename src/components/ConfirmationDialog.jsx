import { useState, useEffect, useRef, useCallback } from "react";
import { useInput } from "../contexts/InputContext";
import { useModal } from "../contexts/ModalContext";
import ButtonIcon from "./ButtonIcon";
import "../styles/ConfirmationDialog.css";

export const ConfirmationDialogFocusId = "ConfirmationDialog";

const ConfirmationDialog = ({ message, onConfirm, onDeny, mountTimestamp }) => {
  const { hideModal } = useModal();
  const { lastInput, claimInputFocus, releaseInputFocus, isFocused } =
    useInput();
  const lastProcessedInput = useRef(mountTimestamp);
  const [confirmSelection, setConfirmSelection] = useState(0);

  useEffect(() => {
    claimInputFocus(ConfirmationDialogFocusId);
    return () => releaseInputFocus(ConfirmationDialogFocusId);
  }, [claimInputFocus, releaseInputFocus]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    hideModal();
  }, [onConfirm, hideModal]);

  const handleDeny = useCallback(() => {
    if (onDeny) {
      onDeny();
    }
    hideModal();
  }, [onDeny, hideModal]);

  useEffect(() => {
    if (
      !isFocused(ConfirmationDialogFocusId) ||
      !lastInput ||
      lastInput.timestamp === lastProcessedInput.current
    ) {
      return;
    }
    lastProcessedInput.current = lastInput.timestamp;

    switch (lastInput.name) {
      case "UP":
      case "DOWN":
        setConfirmSelection((prev) => (prev === 0 ? 1 : 0));
        break;
      case "A":
        if (confirmSelection === 0) {
          handleConfirm();
        } else {
          handleDeny();
        }
        break;
      case "B":
        handleDeny();
        break;
    }
  }, [lastInput, confirmSelection, handleConfirm, handleDeny, isFocused]);

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
        <ButtonIcon button="A" label="Select" size="small" />
        <ButtonIcon button="B" label="Cancel" size="small" />
      </div>
    </div>
  );
};

export default ConfirmationDialog;
