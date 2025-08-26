import React from "react";
import GameShelf from "./GameShelf";
import "../styles/GameLibrary.css";
import { useTranslation } from "../contexts/TranslationContext";

const GameLibrary = ({
  shelves,
  onCardFocus,
  onCardClick,
  setCardRef,
  setShelfRef,
  libraryContainerRef,
  searchQuery,
}) => {
  const { t } = useTranslation();
  const hasResults = shelves.length > 0 && shelves[0].games.length > 0;

  return (
    <main ref={libraryContainerRef} className="game-library">
      <header className="library-header">
        <h1>{searchQuery ? t("Search") : t("My Library")}</h1>
      </header>
      {hasResults ? (
        shelves.map((shelf, shelfIndex) => (
          <GameShelf
            key={shelf.title}
            title={shelf.title}
            games={shelf.games}
            shelfIndex={shelfIndex}
            setCardRef={setCardRef}
            setShelfRef={setShelfRef}
            onCardFocus={onCardFocus}
            onCardClick={onCardClick}
          />
        ))
      ) : (
        <div className="empty-library-message">
          <h2>
            {searchQuery
              ? t('No results for "{{searchQuery}}"', { searchQuery })
              : t("No games found")}
          </h2>
          <p>
            {searchQuery
              ? t("Try a different search term or press 'B' to clear.")
              : t("Add games in Lutris and reload.")}
          </p>
        </div>
      )}
    </main>
  );
};

export default React.memo(GameLibrary);
