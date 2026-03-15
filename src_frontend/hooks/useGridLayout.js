import { useState, useEffect, useRef, useCallback } from "react";

export const useGridLayout = (shelfCount) => {
  const [numberColumns, setNumberColumns] = useState(0);
  const gridReferences = useRef([]);

  const setGridReference = useCallback((element, shelfIndex) => {
    gridReferences.current[shelfIndex] = element;
  }, []);

  useEffect(() => {
    const calculateAndUpdateColumns = () => {
      let maxColumns = 0;

      for (const gridElement of gridReferences.current) {
        if (gridElement) {
          const style = globalThis.getComputedStyle(gridElement);
          const columns = style
            .getPropertyValue("grid-template-columns")
            .split(" ").length;
          if (columns > maxColumns) {
            maxColumns = columns;
          }
        }
      }

      setNumberColumns((currentNumberColumns) => {
        if (maxColumns !== currentNumberColumns) {
          return maxColumns;
        }
        return currentNumberColumns;
      });
    };

    calculateAndUpdateColumns();

    const observers = [];
    for (const gridElement of gridReferences.current) {
      if (!gridElement) continue;
      const observer = new ResizeObserver(calculateAndUpdateColumns);
      observer.observe(gridElement);
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, [shelfCount]);

  return {
    numColumns: numberColumns,
    setGridRef: setGridReference,
    gridRefs: gridReferences,
  };
};
