import { useState, useCallback, useEffect, useRef } from "react";

export const useSpatialNavigation = (
  sections,
  numColumns,
  options = { onMove: null },
) => {
  const [coords, setCoords] = useState({ sectionIndex: 0, itemIndex: 0 });
  const onMoveRef = useRef(options.onMove);

  useEffect(() => {
    onMoveRef.current = options.onMove;
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

        if (numColumns === 0 || !items.length) return current;

        const totalRows = Math.ceil(items.length / numColumns);
        const currentRow = Math.floor(itemIndex / numColumns);
        const currentCol = itemIndex % numColumns;

        let next = { ...current };

        switch (direction) {
          case "UP":
            if (currentRow > 0) {
              next = { sectionIndex, itemIndex: itemIndex - numColumns };
            } else {
              const prevSectionIndex =
                (sectionIndex - 1 + sections.length) % sections.length;
              const prevItems = sections[prevSectionIndex].items;
              if (!prevItems.length) return current;

              const lastItemInPrev = prevItems.length - 1;
              const lastRowInPrev = Math.floor(lastItemInPrev / numColumns);

              next = {
                sectionIndex: prevSectionIndex,
                itemIndex: Math.min(
                  lastRowInPrev * numColumns + currentCol,
                  lastItemInPrev,
                ),
              };
            }
            break;
          case "DOWN":
            if (currentRow < totalRows - 1) {
              next = {
                sectionIndex,
                itemIndex: Math.min(itemIndex + numColumns, items.length - 1),
              };
            } else {
              const nextSectionIndex = (sectionIndex + 1) % sections.length;
              const nextItems = sections[nextSectionIndex].items;
              if (!nextItems.length) return current;
              next = {
                sectionIndex: nextSectionIndex,
                itemIndex: Math.min(currentCol, nextItems.length - 1),
              };
            }
            break;
          case "LEFT":
          case "RIGHT": {
            const rowStart = currentRow * numColumns;
            const rowEnd = Math.min(rowStart + numColumns - 1, items.length - 1);
            const rowLength = rowEnd - rowStart + 1;

            if (rowLength <= 1) return current;

            if (direction === "LEFT") {
              next = {
                sectionIndex,
                itemIndex: itemIndex === rowStart ? rowEnd : itemIndex - 1,
              };
            } else {
              next = {
                sectionIndex,
                itemIndex: itemIndex === rowEnd ? rowStart : itemIndex + 1,
              };
            }
            break;
          }
          default:
            return current;
        }

        if (
          next.sectionIndex !== current.sectionIndex ||
          next.itemIndex !== current.itemIndex
        ) {
          onMoveRef.current?.();
          return next;
        }

        return current;
      });
    },
    [sections, numColumns],
  );

  const moveSection = useCallback(
    (delta) => {
      setCoords((current) => {
        if (sections.length <= 1) return current;
        const nextSectionIndex =
          (current.sectionIndex + delta + sections.length) % sections.length;
        onMoveRef.current?.();
        return { sectionIndex: nextSectionIndex, itemIndex: 0 };
      });
    },
    [sections],
  );

  return { coords, setCoords, move, moveSection };
};
