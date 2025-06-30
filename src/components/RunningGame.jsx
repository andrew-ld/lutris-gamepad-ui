import "../styles/RunningGame.css";
import GameCover from "./GameCover";
import { getDeterministicGradient } from "../utils/color";
import { formatPlaytime } from "../utils/datetime";

const RunningGamePage = ({ game }) => {
  if (!game) return null;

  const gradient = getDeterministicGradient(game.title);

  const backgroundStyle = {
    background: `radial-gradient(circle, ${gradient.start} 0%, ${gradient.end} 100%)`,
  };

  return (
    <div className="running-game-page">
      <div className="running-game-background" style={backgroundStyle} />
      <div className="running-game-content">
        {game.coverPath ? (
          <img
            src={`app://${game.coverPath}`}
            alt={game.title}
            className="running-game-cover"
          />
        ) : (
          <GameCover game={game} className="running-game-cover" />
        )}
        <div className="running-game-info">
          <h2>Now Playing</h2>
          <h1>{game.title}</h1>
          <p>Playtime: {formatPlaytime(game.playtimeSeconds)}</p>
        </div>
      </div>
    </div>
  );
};

export default RunningGamePage;
