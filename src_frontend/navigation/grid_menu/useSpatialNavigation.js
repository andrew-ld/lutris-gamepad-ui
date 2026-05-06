import { useState, useCallback, useEffect, useRef } from "react";

const defaultKeyExtractor = (item) => item?.id ?? item?.slug ?? item?.label;

export const useSpatialNavigation = (sections, numberColumns, options = {}) => {
  const { itemKey = defaultKeyExtractor, onMove } = options;
  const [coords, setCoords] = useState({ sectionIndex: 0, itemIndex: 0 });
  const onMoveReference = useRef(onMove || null);

  useEffect(() => {
    onMoveReference.current = onMove;
  }, [onMove]);

  const [selectedKey, setSelectedKey] = useState(() => {
    const initialItem = sections[0]?.items?.[0];
    return initialItem ? itemKey(initialItem) : null;
  });

  const [previousSections, setPreviousSections] = useState(sections);

  if (sections !== previousSections) {
    setPreviousSections(sections);
    if (selectedKey !== null) {
      let found = false;
      for (const [sectionIndex, section] of sections.entries()) {
        const items = section.items || [];
        const itemIndex = items.findIndex(
          (item) => itemKey(item) === selectedKey,
        );
        if (itemIndex !== -1) {
          if (
            sectionIndex !== coords.sectionIndex ||
            itemIndex !== coords.itemIndex
          ) {
            setCoords({ sectionIndex, itemIndex });
          }
          found = true;
          break;
        }
      }
      if (!found) {
        setCoords({ sectionIndex: 0, itemIndex: 0 });
        const firstItem = sections[0]?.items?.[0];
        setSelectedKey(firstItem ? itemKey(firstItem) : null);
      }
    }
  }

  const move = useCallback(
    (direction) => {
      setCoords((current) => {
        const { sectionIndex, itemIndex } = current;
        const items = sections[sectionIndex]?.items || [];

        if (numberColumns === 0 || items.length === 0) return current;

        const totalRows = Math.ceil(items.length / numberColumns);
        const currentRow = Math.floor(itemIndex / numberColumns);
        const currentCol = itemIndex % numberColumns;

        let next;

        switch (direction) {
          case "UP": {
            if (currentRow > 0) {
              next = { sectionIndex, itemIndex: itemIndex - numberColumns };
            } else {
              const previousSectionIndex =
                (sectionIndex - 1 + sections.length) % sections.length;
              const previousItems = sections[previousSectionIndex].items || [];
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
              const nextItems = sections[nextSectionIndex].items || [];
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
          const nextItem = sections[next.sectionIndex]?.items?.[next.itemIndex];
          if (nextItem) {
            setSelectedKey(itemKey(nextItem));
          }
          onMoveReference.current?.();
          return next;
        }

        return current;
      });
    },
    [sections, numberColumns, itemKey],
  );

  const moveSection = useCallback(
    (delta) => {
      setCoords((current) => {
        if (sections.length <= 1) return current;
        const nextSectionIndex =
          (current.sectionIndex + delta + sections.length) % sections.length;
        const nextItem = sections[nextSectionIndex]?.items?.[0];
        if (nextItem) {
          setSelectedKey(itemKey(nextItem));
        }
        onMoveReference.current?.();
        return {
          sectionIndex: nextSectionIndex,
          itemIndex: 0,
          sectionJump: true,
        };
      });
    },
    [sections, itemKey],
  );

  const setCoordsAndKey = useCallback(
    (newCoordsOrUpdater) => {
      setCoords((current) => {
        const next =
          typeof newCoordsOrUpdater === "function"
            ? newCoordsOrUpdater(current)
            : newCoordsOrUpdater;

        const nextItem = sections[next.sectionIndex]?.items?.[next.itemIndex];
        if (nextItem) {
          setSelectedKey(itemKey(nextItem));
        }
        return next;
      });
    },
    [sections, itemKey],
  );

  return { coords, move, moveSection, setCoords: setCoordsAndKey };
};
