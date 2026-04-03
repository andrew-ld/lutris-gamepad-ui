import React from "react";

import "../styles/GameCard.css";
import { useSettingsState } from "../contexts/SettingsContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useVisibilityObserver } from "../hooks/useVisibilityObserver";
import { formatDate, formatPlaytime } from "../utils/datetime";
import { encodeAppProtocolPath } from "../utils/ipc";

import GameCover from "./GameCover";

const GameCard = React.forwardRef(
  ({ game, onFocus, onClick, isFocused }, reference) => {
    const { t } = useTranslation();
    const { settings } = useSettingsState();

    const { isVisible, setRef } = useVisibilityObserver({
      externalRef: reference,
      rootMargin: "200px",
    });

    return (
      <div
        ref={setRef}
        className={`game-card ${isFocused ? "focused" : ""}`}
        tabIndex="-1"
        onClick={onClick}
        onMouseEnter={onFocus}
      >
        {isVisible ? (
          game.coverPath ? (
            <img
              src={encodeAppProtocolPath(game.coverPath)}
              alt={game.title}
              className="game-card-cover"
              decoding="async"
              loading="lazy"
            />
          ) : (
            <GameCover game={game} className="game-card-cover" />
          )
        ) : (
          <div className="game-card-cover placeholder" />
        )}

        {isVisible && settings.showRunnerIcon && game.runtimeIconPath && (
          <img
            src={`app://${game.runtimeIconPath}`}
            alt="Runner Icon"
            className="game-card-runner-icon"
            decoding="async"
            loading="lazy"
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
  },
);

GameCard.displayName = "GameCard";

export default React.memo(GameCard);
