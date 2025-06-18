import GameCard from "./GameCard";
import "../styles/GameShelf.css";

const GameShelf = ({
  title,
  games,
  shelfIndex,
  cardRefs,
  onCardFocus,
  focusCoords,
}) => {
  return (
    <section className="game-shelf">
      <h2 className="game-shelf-title">{title}</h2>
      <div className="game-shelf-scroll-container">
        {games.map((game, cardIndex) => (
          <GameCard
            key={game.id}
            ref={(el) => (cardRefs.current[shelfIndex][cardIndex] = el)}
            game={game}
            onFocus={() => onCardFocus({ shelf: shelfIndex, card: cardIndex })}
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
