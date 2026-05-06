import { useState, useEffect, useRef, useCallback } from "react";

export const useGridLayout = (shelfCount) => {
  const [numberColumns, setNumberColumns] = useState(0);
  const gridReferences = useRef([]);
  const resizeObserverReference = useRef(null);

  const calculateAndUpdateColumns = useCallback(() => {
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
  }, []);

  const scheduleColumnCalculation = useCallback(() => {
    queueMicrotask(() => {
      if (resizeObserverReference.current) {
        calculateAndUpdateColumns();
      }
    });
  }, [calculateAndUpdateColumns]);

  const setGridReference = useCallback(
    (element, shelfIndex) => {
      const previousElement = gridReferences.current[shelfIndex];
      if (previousElement && resizeObserverReference.current) {
        resizeObserverReference.current.unobserve(previousElement);
      }

      gridReferences.current[shelfIndex] = element;

      if (element && resizeObserverReference.current) {
        resizeObserverReference.current.observe(element);
        scheduleColumnCalculation();
      }
    },
    [scheduleColumnCalculation],
  );

  useEffect(() => {
    const resizeObserver = new ResizeObserver(calculateAndUpdateColumns);
    resizeObserverReference.current = resizeObserver;

    scheduleColumnCalculation();

    for (const gridElement of gridReferences.current) {
      if (!gridElement) continue;
      resizeObserver.observe(gridElement);
    }

    return () => {
      resizeObserver.disconnect();
      if (resizeObserverReference.current === resizeObserver) {
        resizeObserverReference.current = null;
      }
    };
  }, [calculateAndUpdateColumns, scheduleColumnCalculation, shelfCount]);

  return {
    numColumns: numberColumns,
    setGridRef: setGridReference,
    gridRefs: gridReferences,
  };
};
