import "../styles/ControlsOverlay.css";
import { useLutris } from "../contexts/LutrisContext";
import { useModal } from "../contexts/ModalContext";
import ButtonIcon from "./ButtonIcon";

const ControlsOverlay = ({
  focusedGame,
  runningGame,
  hasSearch,
  showSearchModal,
  clearSearch,
}) => {
  const { closeRunningGame, launchGame } = useLutris();
  const { modalContent } = useModal();

  const openSystemMenu = () => {
    window.dispatchEvent(new Event("toggle-system-menu"));
  };

  const showControls = !runningGame && !modalContent;

  return (
    <div className="controls-overlay">
      <div className="hints-list">
        {runningGame && (
          <>
            <ButtonIcon button="Super" label="Toggle Overlay" />

            <ButtonIcon
              button="B"
              onClick={closeRunningGame}
              label={`Force close ${runningGame.title}`}
            />
          </>
        )}

        {showControls && (
          <>
            {focusedGame && (
              <ButtonIcon
                button="A"
                label="Launch Game"
                onClick={() => launchGame(focusedGame)}
              />
            )}

            {hasSearch ? (
              <ButtonIcon
                button="B"
                label="Clear Search"
                onClick={clearSearch}
              />
            ) : null}

            <ButtonIcon button="X" label="Search" onClick={showSearchModal} />
          </>
        )}

        <ButtonIcon onClick={openSystemMenu} button="Y" label="Power" />
      </div>
    </div>
  );
};

export default ControlsOverlay;
