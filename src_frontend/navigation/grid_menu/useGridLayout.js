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

    const animationFrameId = requestAnimationFrame(calculateAndUpdateColumns);

    const resizeObserver = new ResizeObserver(calculateAndUpdateColumns);
    for (const gridElement of gridReferences.current) {
      if (!gridElement) continue;
      resizeObserver.observe(gridElement);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [shelfCount]);

  return {
    gridRefs: gridReferences,
    numColumns: numberColumns,
    setGridRef: setGridReference,
  };
};
