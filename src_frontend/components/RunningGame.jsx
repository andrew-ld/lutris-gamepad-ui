import "../styles/RunningGame.css";
import { useTranslation } from "../contexts/TranslationContext";
import { getDeterministicGradient } from "../utils/color";
import { formatPlaytime } from "../utils/datetime";

import GameCover from "./GameCover";

const RunningGamePage = ({ game, isPaused }) => {
  const { t } = useTranslation();
  if (!game) return null;

  const gradient = getDeterministicGradient(game.title);

  const backgroundStyle = {
    background: `radial-gradient(circle, ${gradient.start} 0%, ${gradient.end} 100%)`,
  };

  return (
    <div className="running-game-page">
      <div className="running-game-background" style={backgroundStyle} />
      <div className="running-game-content">
        <div className="running-game-cover-container">
          {game.coverPath ? (
            <img
              src={`app://${game.coverPath}`}
              alt={game.title}
              className="running-game-cover"
              decoding="async"
              loading="lazy"
            />
          ) : (
            <GameCover game={game} className="running-game-cover" />
          )}
        </div>
        <div className="running-game-info">
          <h2>{t("Now Playing")}</h2>
          <h1>{game.title}</h1>
          {isPaused && (
            <h2 className="running-game-paused-text">{t("Paused")}</h2>
          )}
          <p>
            {t("Playtime: {{playtime}}", {
              playtime: formatPlaytime(game.playtimeSeconds),
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RunningGamePage;
