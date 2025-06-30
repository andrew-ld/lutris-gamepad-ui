import React from "react";
import "../styles/ControlsOverlay.css";
import ButtonIcon from "./ButtonIcon";

const ControlsOverlay = ({
  onCloseRunningGame,
  runningGameTitle,
  onLaunchGame,
  onClearSearch,
  onShowSearchModal,
  onOpenSystemMenu,
}) => {
  return (
    <div className="controls-overlay">
      <div className="hints-list">
        {onCloseRunningGame && (
          <>
            <ButtonIcon button="Super" label="Toggle Overlay" />
            <ButtonIcon
              button="B"
              onClick={onCloseRunningGame}
              label={`Force close ${runningGameTitle || "game"}`}
            />
          </>
        )}

        {onLaunchGame && (
          <ButtonIcon button="A" label="Launch Game" onClick={onLaunchGame} />
        )}

        {onClearSearch && (
          <ButtonIcon button="B" label="Clear Search" onClick={onClearSearch} />
        )}

        {onShowSearchModal && (
          <ButtonIcon button="X" label="Search" onClick={onShowSearchModal} />
        )}

        {onOpenSystemMenu && (
          <ButtonIcon onClick={onOpenSystemMenu} button="Y" label="Power" />
        )}
      </div>
    </div>
  );
};

export default React.memo(ControlsOverlay);
