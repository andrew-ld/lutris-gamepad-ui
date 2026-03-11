import { useMemo, useCallback } from "react";
import { openExternalLink } from "../utils/ipc";
import { useTranslation } from "../contexts/TranslationContext";
import { useScopedInput } from "../hooks/useScopedInput";
import { usePlayButtonActionSound } from "../hooks/usePlayButtonActionSound";
import DialogLayout from "./DialogLayout";

export const UpdateDialogFocusId = "UpdateDialog";

const UpdateDialog = ({ newVersion, releaseUrl, onClose }) => {
  const { t } = useTranslation();
  const playActionSound = usePlayButtonActionSound();

  const handleOpenLink = useCallback(() => {
    openExternalLink(releaseUrl);
    onClose();
  }, [releaseUrl, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const inputHandler = useCallback(
    (input) => {
      switch (input.name) {
        case "A":
          playActionSound();
          handleOpenLink();
          break;
        case "B":
          playActionSound();
          handleClose();
          break;
      }
    },
    [handleOpenLink, handleClose, playActionSound],
  );

  useScopedInput(inputHandler, UpdateDialogFocusId);

  const legendItems = useMemo(
    () => [
      { button: "A", label: t("Go to Downloads"), onClick: handleOpenLink },
      { button: "B", label: t("Later"), onClick: handleClose },
    ],
    [handleOpenLink, handleClose, t],
  );

  return (
    <DialogLayout
      title={t("Update Available")}
      description={t("A new version, {{version}}, is available for download.", {
        version: newVersion,
      })}
      legendItems={legendItems}
      maxWidth="450px"
    >
      <button
        className="modal-button focused"
        style={{ width: "100%" }}
        onClick={handleOpenLink}
      >
        {t("Go to Downloads")}
      </button>
    </DialogLayout>
  );
};

export default UpdateDialog;
