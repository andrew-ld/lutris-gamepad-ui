import React from "react";
import "../styles/GameCard.css";
import GameCover from "./GameCover";
import { formatDate, formatPlaytime } from "../utils/datetime";
import { useTranslation } from "../contexts/TranslationContext";
import { useSettingsState } from "../contexts/SettingsContext";

const GameCard = React.forwardRef(({ game, onFocus, onClick }, ref) => {
  const { t } = useTranslation();
  const { settings } = useSettingsState();

  return (
    <div
      ref={ref}
      className="game-card"
      tabIndex="-1"
      onClick={onClick}
      onMouseEnter={onFocus}
    >
      {game.coverPath ? (
        <img
          src={`app://${game.coverPath}`}
          alt={game.title}
          className="game-card-cover"
        />
      ) : (
        <GameCover game={game} className="game-card-cover" />
      )}
      {settings.showRunnerIcon && game.runtimeIconPath && (
        <img
          src={`app://${game.runtimeIconPath}`}
          alt="Runner Icon"
          className="game-card-runner-icon"
        />
      )}
      <div className="game-card-overlay">
        <div className="game-card-info">
          <h3 className="game-card-title">{game.title}</h3>
          <p>
            {t("Playtime: {{playtime}}", {
              playtime: formatPlaytime(game.playtimeSeconds),
            })}
          </p>
          <p>
            {t("Last played: {{date}}", {
              date: formatDate(game.lastPlayed) || t("Never"),
            })}
          </p>
        </div>
      </div>
    </div>
  );
});

export default React.memo(GameCard);
