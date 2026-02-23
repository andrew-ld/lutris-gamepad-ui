import React from "react";
import "../styles/ControlsOverlay.css";
import ButtonIcon from "./ButtonIcon";
import { useTranslation } from "../contexts/TranslationContext";

const ControlsOverlay = ({
  onCloseRunningGame,
  onLaunchGame,
  onClearSearch,
  onShowSearchModal,
  onOpenSystemMenu,
  onToggleGamePause,
  isGamePaused,
}) => {
  const { t } = useTranslation();
  return (
    <div className="controls-overlay">
      <div className="hints-list">
        {onCloseRunningGame && (
          <>
            <ButtonIcon button="Super" label={t("Toggle Overlay")} />

            {onToggleGamePause && (
              <ButtonIcon
                button="X"
                label={isGamePaused ? t("Resume Game") : t("Pause Game")}
                onClick={onToggleGamePause}
              />
            )}

            {onCloseRunningGame && (
              <ButtonIcon
                button="B"
                onClick={onCloseRunningGame}
                label={t("Force close")}
              />
            )}
          </>
        )}

        {onLaunchGame && (
          <ButtonIcon
            button="A"
            label={t("Launch Game")}
            onClick={onLaunchGame}
          />
        )}

        {onClearSearch && (
          <ButtonIcon
            button="B"
            label={t("Clear Search")}
            onClick={onClearSearch}
          />
        )}

        {onShowSearchModal && (
          <ButtonIcon
            button="X"
            label={t("Search")}
            onClick={onShowSearchModal}
          />
        )}

        {onOpenSystemMenu && (
          <ButtonIcon
            onClick={onOpenSystemMenu}
            button="Y"
            label={t("Power")}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(ControlsOverlay);
