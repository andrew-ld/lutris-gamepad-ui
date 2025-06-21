import GameCard from "./GameCard";
import "../styles/GameShelf.css";

const GameShelf = ({
  title,
  games,
  shelfIndex,
  setCardRef,
  onCardFocus,
  onCardClick,
  focusCoords,
}) => {
  return (
    <section className="game-shelf">
      <h2 className="game-shelf-title">{title}</h2>
      <div className="game-shelf-scroll-container">
        {games.map((game, cardIndex) => (
          <GameCard
            key={game.id}
            ref={(el) => setCardRef(el, shelfIndex, cardIndex)}
            game={game}
            onFocus={() => onCardFocus({ shelf: shelfIndex, card: cardIndex })}
            onClick={() => onCardClick(game)}
            isFocused={
              focusCoords.shelf === shelfIndex && focusCoords.card === cardIndex
            }
          />
        ))}
      </div>
    </section>
  );
};

export default GameShelf;
