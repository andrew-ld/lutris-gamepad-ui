import { useState, useCallback, useEffect, useRef } from "react";

export const useSpatialNavigation = (sections, numberColumns, options = {}) => {
  const [coords, setCoords] = useState({ sectionIndex: 0, itemIndex: 0 });
  const onMoveReference = useRef(options.onMove || null);

  useEffect(() => {
    onMoveReference.current = options.onMove;
  }, [options.onMove]);

  useEffect(() => {
    setCoords({ sectionIndex: 0, itemIndex: 0 });
  }, [sections]);

  const move = useCallback(
    (direction) => {
      setCoords((current) => {
        const { sectionIndex, itemIndex } = current;
        const currentSection = sections[sectionIndex];
        const items = currentSection?.items || [];

        if (numberColumns === 0 || items.length === 0) return current;

        const totalRows = Math.ceil(items.length / numberColumns);
        const currentRow = Math.floor(itemIndex / numberColumns);
        const currentCol = itemIndex % numberColumns;

        let next = { ...current };

        switch (direction) {
          case "UP": {
            if (currentRow > 0) {
              next = { sectionIndex, itemIndex: itemIndex - numberColumns };
            } else {
              const previousSectionIndex =
                (sectionIndex - 1 + sections.length) % sections.length;
              const previousItems = sections[previousSectionIndex].items;
              if (previousItems.length === 0) return current;

              const lastItemInPrevious = previousItems.length - 1;
              const lastRowInPrevious = Math.floor(
                lastItemInPrevious / numberColumns,
              );

              next = {
                sectionIndex: previousSectionIndex,
                itemIndex: Math.min(
                  lastRowInPrevious * numberColumns + currentCol,
                  lastItemInPrevious,
                ),
              };
            }
            break;
          }
          case "DOWN": {
            if (currentRow < totalRows - 1) {
              next = {
                sectionIndex,
                itemIndex: Math.min(
                  itemIndex + numberColumns,
                  items.length - 1,
                ),
              };
            } else {
              const nextSectionIndex = (sectionIndex + 1) % sections.length;
              const nextItems = sections[nextSectionIndex].items;
              if (nextItems.length === 0) return current;
              next = {
                sectionIndex: nextSectionIndex,
                itemIndex: Math.min(currentCol, nextItems.length - 1),
              };
            }
            break;
          }
          case "LEFT":
          case "RIGHT": {
            const rowStart = currentRow * numberColumns;
            const rowEnd = Math.min(
              rowStart + numberColumns - 1,
              items.length - 1,
            );
            const rowLength = rowEnd - rowStart + 1;

            if (rowLength <= 1) return current;

            next =
              direction === "LEFT"
                ? {
                    sectionIndex,
                    itemIndex: itemIndex === rowStart ? rowEnd : itemIndex - 1,
                  }
                : {
                    sectionIndex,
                    itemIndex: itemIndex === rowEnd ? rowStart : itemIndex + 1,
                  };
            break;
          }
          default: {
            return current;
          }
        }

        if (
          next.sectionIndex !== current.sectionIndex ||
          next.itemIndex !== current.itemIndex
        ) {
          onMoveReference.current?.();
          return next;
        }

        return current;
      });
    },
    [sections, numberColumns],
  );

  const moveSection = useCallback(
    (delta) => {
      setCoords((current) => {
        if (sections.length <= 1) return current;
        const nextSectionIndex =
          (current.sectionIndex + delta + sections.length) % sections.length;
        onMoveReference.current?.();
        return { sectionIndex: nextSectionIndex, itemIndex: 0 };
      });
    },
    [sections],
  );

  return { coords, setCoords, move, moveSection };
};
