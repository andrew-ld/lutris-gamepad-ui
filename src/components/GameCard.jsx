import React from "react";
import { launchGame } from "../utils/lutris";
import "../styles/GameCard.css";
import GameCover from "./GameCover";

const formatDate = (date) => {
  if (!date) return "Never";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const GameCard = React.forwardRef(({ game, onFocus, isFocused }, ref) => {
  const handleLaunchGame = () => {
    launchGame(game);
  };

  return (
    <div
      ref={ref}
      className={`game-card ${isFocused ? "focused" : ""}`}
      tabIndex="-1"
      onClick={handleLaunchGame}
      onMouseEnter={onFocus}
    >
      <GameCover game={game} className="game-card-cover" />
      <div className="game-card-overlay">
        <div className="game-card-info">
          <h3 className="game-card-title">{game.title}</h3>
          <p>Playtime: {game.playtime}</p>
          <p>Last played: {formatDate(game.lastPlayed)}</p>
        </div>
      </div>
    </div>
  );
});

export default GameCard;
