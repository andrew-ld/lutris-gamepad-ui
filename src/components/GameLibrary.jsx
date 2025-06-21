import GameShelf from "./GameShelf";
import "../styles/GameLibrary.css";

const GameLibrary = ({
  shelves,
  focusCoords,
  onCardFocus,
  onCardClick,
  setCardRef,
}) => {
  return (
    <main className="game-library">
      <header className="library-header">
        <h1>My Library</h1>
      </header>
      {shelves.map((shelf, shelfIndex) => (
        <GameShelf
          key={shelf.title}
          title={shelf.title}
          games={shelf.games}
          shelfIndex={shelfIndex}
          setCardRef={setCardRef}
          onCardFocus={onCardFocus}
          onCardClick={onCardClick}
          focusCoords={focusCoords}
        />
      ))}
    </main>
  );
};

export default GameLibrary;
