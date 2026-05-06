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

  const setGridReference = useCallback(
    (element, shelfIndex) => {
      const previousElement = gridReferences.current[shelfIndex];
      if (previousElement && resizeObserverReference.current) {
        resizeObserverReference.current.unobserve(previousElement);
      }

      gridReferences.current[shelfIndex] = element;

      if (element && resizeObserverReference.current) {
        resizeObserverReference.current.observe(element);
        queueMicrotask(calculateAndUpdateColumns);
      }
    },
    [calculateAndUpdateColumns],
  );

  useEffect(() => {
    const resizeObserver = new ResizeObserver(calculateAndUpdateColumns);
    resizeObserverReference.current = resizeObserver;

    let isDisposed = false;
    queueMicrotask(() => {
      if (!isDisposed) {
        calculateAndUpdateColumns();
      }
    });

    for (const gridElement of gridReferences.current) {
      if (!gridElement) continue;
      resizeObserver.observe(gridElement);
    }

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (resizeObserverReference.current === resizeObserver) {
        resizeObserverReference.current = null;
      }
    };
  }, [calculateAndUpdateColumns, shelfCount]);

  return {
    numColumns: numberColumns,
    setGridRef: setGridReference,
    gridRefs: gridReferences,
  };
};
