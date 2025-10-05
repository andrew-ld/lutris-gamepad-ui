import { useMemo, useCallback } from "react";
import LegendaContainer from "./LegendaContainer";
import { openExternalLink } from "../utils/ipc";
import { useTranslation } from "../contexts/TranslationContext";
import { useScopedInput } from "../hooks/useScopedInput";
import "../styles/UpdateDialog.css";
import { playActionSound } from "../utils/sound";

export const UpdateDialogFocusId = "UpdateDialog";

const UpdateDialog = ({ newVersion, releaseUrl, onClose }) => {
  const { t } = useTranslation();

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
    [handleOpenLink, handleClose]
  );

  useScopedInput(inputHandler, UpdateDialogFocusId);

  const legendItems = useMemo(
    () => [
      { button: "A", label: t("Go to Downloads"), onClick: handleOpenLink },
      { button: "B", label: t("Later"), onClick: handleClose },
    ],
    [handleOpenLink, handleClose, t]
  );

  return (
    <div className="update-dialog-container">
      <LegendaContainer legendItems={legendItems}>
        <div className="update-dialog-content">
          <h2 className="update-dialog-title">{t("Update Available")}</h2>
          <p className="update-dialog-description">
            {t("A new version, {{version}}, is available for download.", {
              version: newVersion,
            })}
          </p>
          <button className="update-dialog-button" onClick={handleOpenLink}>
            {t("Go to Downloads")}
          </button>
        </div>
      </LegendaContainer>
    </div>
  );
};

export default UpdateDialog;
