import React from "react";
import "../styles/GameCard.css";
import GameCover from "./GameCover";
import { formatDate, formatPlaytime } from "../utils/datetime";

const GameCard = React.forwardRef(({ game, onFocus, onClick }, ref) => {
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
      <div className="game-card-overlay">
        <div className="game-card-info">
          <h3 className="game-card-title">{game.title}</h3>
          <p>Playtime: {formatPlaytime(game.playtimeSeconds)}</p>
          <p>Last played: {formatDate(game.lastPlayed)}</p>
        </div>
      </div>
    </div>
  );
});

export default React.memo(GameCard);
