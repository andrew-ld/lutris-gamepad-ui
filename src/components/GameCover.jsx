import { getDeterministicGradient } from "../utils/color";
import "../styles/GameCover.css";

const GameCover = ({ game, className }) => {
  const gradient = getDeterministicGradient(game.title);

  const style = {
    background: `linear-gradient(145deg, ${gradient.start}, ${gradient.end})`,
  };

  return (
    <div className={`game-cover ${className || ""}`} style={style}>
      <h4 className="game-cover-title">{game.title}</h4>
    </div>
  );
};

export default GameCover;
