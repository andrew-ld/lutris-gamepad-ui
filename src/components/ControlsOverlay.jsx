import "../styles/ControlsOverlay.css";
import { useLutris } from "../contexts/LutrisContext";

const ButtonHint = ({ button, label, onClick }) => (
  <div className="button-hint" onClick={onClick}>
    <div className={`button-icon button-${button.toLowerCase()}`}>{button}</div>
    <span className="button-label">{label}</span>
  </div>
);

const ControlsOverlay = ({ focusedGame, runningGame }) => {
  const { fetchGames, closeRunningGame, launchGame } = useLutris();

  return (
    <div className="controls-overlay">
      <div className="hints-list">
        {runningGame && (
          <ButtonHint
            button="B"
            onClick={closeRunningGame}
            label={`Force close ${runningGame.title}`}
          />
        )}

        {focusedGame && !runningGame && (
          <ButtonHint
            button="X"
            label="Launch Game"
            onClick={() => launchGame(focusedGame)}
          />
        )}

        <ButtonHint onClick={fetchGames} button="A" label="Reload" />
        <ButtonHint onClick={() => window.close()} button="Y" label="Exit" />
      </div>
    </div>
  );
};

export default ControlsOverlay;
