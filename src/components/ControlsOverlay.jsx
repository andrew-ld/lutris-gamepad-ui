import "../styles/ControlsOverlay.css";
import { useLutris } from "../contexts/LutrisContext";
import ButtonIcon from "./ButtonIcon";

const ControlsOverlay = ({ focusedGame, runningGame }) => {
  const { fetchGames, closeRunningGame, launchGame } = useLutris();

  const openSystemMenu = () => {
    window.dispatchEvent(new Event("toggle-system-menu"));
  };

  return (
    <div className="controls-overlay">
      <div className="hints-list">
        {runningGame && (
          <ButtonIcon
            button="B"
            onClick={closeRunningGame}
            label={`Force close ${runningGame.title}`}
          />
        )}

        {focusedGame && !runningGame && (
          <ButtonIcon
            button="X"
            label="Launch Game"
            onClick={() => launchGame(focusedGame)}
          />
        )}

        <ButtonIcon onClick={fetchGames} button="A" label="Reload" />
        <ButtonIcon onClick={openSystemMenu} button="Y" label="Power" />
      </div>
    </div>
  );
};

export default ControlsOverlay;
